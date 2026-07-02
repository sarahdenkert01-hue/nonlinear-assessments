import type { Prisma } from "@prisma/client";
// Import server-safe modules directly (not the feature barrel, which re-exports client components).
import { QUESTIONS } from "@/features/assessments/data/questions";
import {
  computeThemeScores,
  getTriggeredQuestionsForTheme,
} from "@/features/assessments/lib/scoring";
import { isAssessmentQuestion, type ClinicianOverrides } from "@/features/assessments/types";
import { logSessionEvent } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { responsesToAnswers } from "@/lib/episodes/responses";
import type { ThemeReportContext } from "@/lib/reports/build-context";
import { planFindings } from "./plan";
import type {
  AddFindingInput,
  FindingRecord,
  UpdateFindingInput,
} from "./types";

const episodeWithResponses = {
  modules: { orderBy: { createdAt: "asc" }, include: { responses: true } },
} satisfies Prisma.AssessmentEpisodeInclude;

type EpisodeWithResponses = Prisma.AssessmentEpisodeGetPayload<{
  include: typeof episodeWithResponses;
}>;
type FindingWithEvidence = Prisma.FindingGetPayload<{ include: { evidence: true } }>;

// Readable question text keyed by item id, built once.
const QUESTION_TEXT: Map<string, string> = new Map(
  QUESTIONS.filter(isAssessmentQuestion).map((q) => [q.id, q.text]),
);

function parseOverrides(value: Prisma.JsonValue | null): ClinicianOverrides {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as ClinicianOverrides;
  }
  return {};
}

// The one client-facing module for an episode (Sprint 2 keeps this single-module).
function clientModuleOf(episode: EpisodeWithResponses) {
  return episode.modules.find((m) => m.audience === "CLIENT") ?? episode.modules[0] ?? null;
}

function toRecord(
  finding: FindingWithEvidence,
  answers: Record<string, string>,
): FindingRecord {
  return {
    id: finding.id,
    episodeId: finding.episodeId,
    code: finding.code,
    label: finding.label,
    category: finding.category,
    status: finding.status,
    source: finding.source,
    confidence: finding.confidence,
    alternativeExplanations: finding.alternativeExplanations,
    rationale: finding.rationale,
    hits: finding.hits,
    total: finding.total,
    evidence: finding.evidence.map((e) => {
      const itemId = e.itemId ?? "";
      return {
        id: e.id,
        itemId,
        text: QUESTION_TEXT.get(itemId) ?? itemId,
        answer: answers[itemId] ?? "",
      };
    }),
    createdAt: finding.createdAt.toISOString(),
    updatedAt: finding.updatedAt.toISOString(),
  };
}

async function loadEpisode(episodeId: string): Promise<EpisodeWithResponses | null> {
  return prisma.assessmentEpisode.findUnique({
    where: { id: episodeId },
    include: episodeWithResponses,
  });
}

// Generate findings from the algorithm scores the first time an episode is reviewed. Idempotent:
// does nothing if findings already exist. Prior clinician include/exclude overrides (from the
// legacy `overrides` JSON) are translated into finding statuses so nothing is lost.
export async function ensureFindingsForEpisode(episodeId: string): Promise<void> {
  const existing = await prisma.finding.count({ where: { episodeId } });
  if (existing > 0) return;

  const episode = await loadEpisode(episodeId);
  if (!episode) return;
  const clientMod = clientModuleOf(episode);
  if (!clientMod) return;

  const answers = responsesToAnswers(clientMod.responses);
  const responseIdByItem = new Map(clientMod.responses.map((r) => [r.itemId, r.id]));
  const scores = computeThemeScores(answers);
  const drafts = planFindings(scores, parseOverrides(episode.overrides));

  for (const draft of drafts) {
    const triggered = getTriggeredQuestionsForTheme(draft.code, answers);
    await prisma.finding.create({
      data: {
        episodeId,
        moduleInstanceId: clientMod.id,
        code: draft.code,
        label: draft.label,
        category: draft.category,
        status: draft.status,
        source: draft.source,
        hits: draft.hits,
        total: draft.total,
        evidence: {
          create: triggered.map((q) => ({
            responseId: responseIdByItem.get(q.id) ?? null,
            itemId: q.id,
          })),
        },
      },
    });
  }
}

export async function listFindingsForEpisode(episodeId: string): Promise<FindingRecord[]> {
  const episode = await loadEpisode(episodeId);
  const clientMod = episode ? clientModuleOf(episode) : null;
  const answers = clientMod ? responsesToAnswers(clientMod.responses) : {};

  const findings = await prisma.finding.findMany({
    where: { episodeId },
    include: { evidence: true },
    orderBy: [{ status: "asc" }, { hits: "desc" }],
  });
  return findings.map((f) => toRecord(f, answers));
}

async function getFindingRecord(findingId: string): Promise<FindingRecord | null> {
  const finding = await prisma.finding.findUnique({
    where: { id: findingId },
    include: { evidence: true },
  });
  if (!finding) return null;
  const episode = await loadEpisode(finding.episodeId);
  const clientMod = episode ? clientModuleOf(episode) : null;
  const answers = clientMod ? responsesToAnswers(clientMod.responses) : {};
  return toRecord(finding, answers);
}

export async function updateFinding(
  findingId: string,
  clinicianId: string,
  input: UpdateFindingInput,
): Promise<FindingRecord | null> {
  const finding = await prisma.finding.findFirst({
    where: { id: findingId, episode: { clinicianId } },
  });
  if (!finding) return null;

  await prisma.finding.update({
    where: { id: findingId },
    data: {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.confidence !== undefined ? { confidence: input.confidence } : {}),
      ...(input.alternativeExplanations !== undefined
        ? { alternativeExplanations: input.alternativeExplanations }
        : {}),
      ...(input.rationale !== undefined ? { rationale: input.rationale } : {}),
    },
  });

  await logSessionEvent(finding.episodeId, "review.finding_updated", {
    actorType: "clinician",
    actorId: clinicianId,
    metadata: { code: finding.code, status: input.status },
  });
  return getFindingRecord(findingId);
}

// Add a finding for a theme the algorithm did not flag. Marked ACCEPTED / CLINICIAN and linked to
// any endorsed items that exist for that theme.
export async function addFinding(
  episodeId: string,
  clinicianId: string,
  input: AddFindingInput,
): Promise<FindingRecord | null> {
  const episode = await prisma.assessmentEpisode.findFirst({
    where: { id: episodeId, clinicianId },
    include: episodeWithResponses,
  });
  if (!episode) return null;
  const clientMod = clientModuleOf(episode);

  const answers = clientMod ? responsesToAnswers(clientMod.responses) : {};
  const responseIdByItem = new Map(
    (clientMod?.responses ?? []).map((r) => [r.itemId, r.id]),
  );
  const score = computeThemeScores(answers).find((s) => s.id === input.code);
  const triggered = getTriggeredQuestionsForTheme(input.code, answers);

  const finding = await prisma.finding.create({
    data: {
      episodeId,
      moduleInstanceId: clientMod?.id ?? null,
      code: input.code,
      label: input.label || score?.label || input.code,
      category: input.category ?? score?.category ?? null,
      status: "ACCEPTED",
      source: "CLINICIAN",
      hits: score?.hits ?? 0,
      total: score?.total ?? 0,
      evidence: {
        create: triggered.map((q) => ({
          responseId: responseIdByItem.get(q.id) ?? null,
          itemId: q.id,
        })),
      },
    },
  });

  await logSessionEvent(episodeId, "review.finding_added", {
    actorType: "clinician",
    actorId: clinicianId,
    metadata: { code: input.code },
  });
  return getFindingRecord(finding.id);
}

// Map the episode's included findings into the shape the report generator expects. This makes the
// report a projection of the findings record rather than a re-computation from raw answers.
export async function buildFindingThemeContext(
  episodeId: string,
): Promise<ThemeReportContext[]> {
  const episode = await loadEpisode(episodeId);
  const clientMod = episode ? clientModuleOf(episode) : null;
  const answers = clientMod ? responsesToAnswers(clientMod.responses) : {};

  const findings = await prisma.finding.findMany({
    where: { episodeId, status: { not: "EXCLUDED" } },
    include: { evidence: true },
    orderBy: { hits: "desc" },
  });

  return findings.map((f) => ({
    id: f.code,
    label: f.label,
    category: f.category ?? "",
    source: f.source === "CLINICIAN" ? "clinician-include" : "algorithm",
    hits: f.hits,
    total: f.total,
    endorsedItems: f.evidence.map((e) => {
      const itemId = e.itemId ?? "";
      return {
        id: itemId,
        text: QUESTION_TEXT.get(itemId) ?? itemId,
        answer: answers[itemId] ?? "",
      };
    }),
  }));
}
