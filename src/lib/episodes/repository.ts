import type { Prisma } from "@prisma/client";
import type { AssessmentAnswers, ClinicianOverrides } from "@/features/assessments";
import { logSessionEvent } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { generateIntakeToken } from "@/lib/tokens";
import { answersToRows, responsesToAnswers } from "./responses";
import type {
  ClientRecord,
  CreateClientInput,
  CreateSessionInput,
  EpisodeRecord,
  ListSessionsQuery,
  ModuleSummary,
  UpdateSessionReviewInput,
} from "./types";

const DEFAULT_TOKEN_EXPIRY_DAYS = 30;

// Sprint 1: every episode has exactly one client-facing module, the Nonlinear screener.
const NONLINEAR_MODULE = { key: "nonlinear-screener", version: "1" } as const;

// Always load an episode together with its modules and their answers so we can present the
// single flat record the rest of the app expects.
const episodeInclude = {
  modules: {
    orderBy: { createdAt: "asc" },
    include: { responses: true },
  },
} satisfies Prisma.AssessmentEpisodeInclude;

type EpisodeRow = Prisma.AssessmentEpisodeGetPayload<{ include: typeof episodeInclude }>;
type ModuleRow = EpisodeRow["modules"][number];

function toIso(date: Date | null | undefined): string | null {
  return date?.toISOString() ?? null;
}

function parseOverrides(value: Prisma.JsonValue | null): ClinicianOverrides | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as ClinicianOverrides;
  }
  return null;
}

// The one client-facing module (Sprint 1 has exactly one module per episode).
function clientModule(row: EpisodeRow): ModuleRow | null {
  return row.modules.find((m) => m.audience === "CLIENT") ?? row.modules[0] ?? null;
}

function toRecord(row: EpisodeRow): EpisodeRecord {
  const clientMod = clientModule(row);
  const answers = responsesToAnswers(clientMod?.responses ?? []);

  return {
    id: row.id,
    token: clientMod?.token ?? "",
    clinicianId: row.clinicianId,
    clientId: row.clientId,
    status: row.status,
    clientName: row.clientName,
    answers,
    overrides: parseOverrides(row.overrides),
    clinicianNotes: row.clinicianNotes,
    reportDraft: row.reportDraft,
    reportFinal: row.reportFinal,
    reportGeneratedAt: toIso(row.reportGeneratedAt),
    reportFinalizedAt: toIso(row.reportFinalizedAt),
    consentAcceptedAt: toIso(clientMod?.consentAcceptedAt),
    tokenExpiresAt: toIso(clientMod?.tokenExpiresAt),
    revokedAt: toIso(clientMod?.revokedAt),
    notifiedAt: toIso(row.notifiedAt),
    submittedAt: toIso(row.submittedAt),
    reviewedAt: toIso(row.reviewedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toClientRecord(row: {
  id: string;
  clinicianId: string;
  displayName: string;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ClientRecord {
  return {
    id: row.id,
    clinicianId: row.clinicianId,
    displayName: row.displayName,
    email: row.email,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function loadEpisodeById(id: string): Promise<EpisodeRecord | null> {
  const row = await prisma.assessmentEpisode.findUnique({ where: { id }, include: episodeInclude });
  return row ? toRecord(row) : null;
}

async function loadEpisodeByToken(token: string): Promise<EpisodeRecord | null> {
  const row = await prisma.assessmentEpisode.findFirst({
    where: { modules: { some: { token } } },
    include: episodeInclude,
  });
  return row ? toRecord(row) : null;
}

function buildFilterWhere(
  clinicianId: string,
  query: ListSessionsQuery,
): Prisma.AssessmentEpisodeWhereInput {
  const where: Prisma.AssessmentEpisodeWhereInput = { clinicianId };

  switch (query.filter) {
    case "awaiting_client":
      where.status = "DRAFT";
      break;
    case "ready_to_review":
      where.status = "SUBMITTED";
      where.reportDraft = null;
      break;
    case "in_progress":
      where.status = { in: ["SUBMITTED", "REVIEWED"] };
      where.reportDraft = { not: null };
      where.reportFinalizedAt = null;
      break;
    case "reviewed":
      where.status = "REVIEWED";
      break;
    default:
      break;
  }

  if (query.search?.trim()) {
    where.clientName = { contains: query.search.trim() };
  }

  return where;
}

// Replace all of a module's answers with a new set, inside one transaction.
async function replaceModuleResponses(
  moduleInstanceId: string,
  answers: AssessmentAnswers,
): Promise<void> {
  const rows = answersToRows(answers);
  await prisma.$transaction([
    prisma.response.deleteMany({ where: { moduleInstanceId } }),
    prisma.response.createMany({
      data: rows.map((r) => ({ moduleInstanceId, itemId: r.itemId, value: r.value })),
    }),
  ]);
}

export async function createClient(input: CreateClientInput): Promise<ClientRecord> {
  const row = await prisma.client.create({
    data: {
      clinicianId: input.clinicianId,
      displayName: input.displayName.trim(),
      email: input.email?.trim() ?? null,
    },
  });
  return toClientRecord(row);
}

export async function listClientsForClinician(clinicianId: string): Promise<ClientRecord[]> {
  const rows = await prisma.client.findMany({
    where: { clinicianId },
    orderBy: { displayName: "asc" },
  });
  return rows.map(toClientRecord);
}

export async function getClientForClinician(
  id: string,
  clinicianId: string,
): Promise<ClientRecord | null> {
  const row = await prisma.client.findFirst({ where: { id, clinicianId } });
  return row ? toClientRecord(row) : null;
}

export async function createSession(input: CreateSessionInput): Promise<EpisodeRecord> {
  const days = input.tokenExpiresInDays ?? DEFAULT_TOKEN_EXPIRY_DAYS;
  const tokenExpiresAt = new Date();
  tokenExpiresAt.setDate(tokenExpiresAt.getDate() + days);

  let clientName = input.clientName ?? null;
  if (input.clientId) {
    const client = await prisma.client.findFirst({
      where: { id: input.clientId, clinicianId: input.clinicianId },
    });
    if (client) clientName = client.displayName;
  }

  const row = await prisma.assessmentEpisode.create({
    data: {
      clinicianId: input.clinicianId,
      clientId: input.clientId ?? null,
      clientName,
      modules: {
        create: {
          moduleKey: NONLINEAR_MODULE.key,
          moduleVersion: NONLINEAR_MODULE.version,
          audience: "CLIENT",
          status: "NOT_STARTED",
          token: generateIntakeToken(),
          tokenExpiresAt,
        },
      },
    },
    include: episodeInclude,
  });

  const record = toRecord(row);
  await logSessionEvent(record.id, "session.created", {
    actorType: "clinician",
    actorId: input.clinicianId,
    metadata: { clientName: record.clientName, expiresAt: record.tokenExpiresAt },
  });
  return record;
}

export async function listSessionsForClinician(
  clinicianId: string,
  query: ListSessionsQuery = {},
): Promise<EpisodeRecord[]> {
  const rows = await prisma.assessmentEpisode.findMany({
    where: buildFilterWhere(clinicianId, query),
    orderBy: { updatedAt: "desc" },
    include: episodeInclude,
  });
  return rows.map(toRecord);
}

export async function getSessionByToken(token: string): Promise<EpisodeRecord | null> {
  return loadEpisodeByToken(token);
}

export async function getSessionById(id: string): Promise<EpisodeRecord | null> {
  return loadEpisodeById(id);
}

export async function getSessionForClinician(
  id: string,
  clinicianId: string,
): Promise<EpisodeRecord | null> {
  const row = await prisma.assessmentEpisode.findFirst({
    where: { id, clinicianId },
    include: episodeInclude,
  });
  return row ? toRecord(row) : null;
}

export async function listSessionsForClient(
  clientId: string,
  clinicianId: string,
): Promise<EpisodeRecord[]> {
  const rows = await prisma.assessmentEpisode.findMany({
    where: { clientId, clinicianId },
    orderBy: { createdAt: "desc" },
    include: episodeInclude,
  });
  return rows.map(toRecord);
}

// Per-module summary for the episode overview page.
export async function listModulesForEpisode(
  id: string,
  clinicianId: string,
): Promise<ModuleSummary[] | null> {
  const row = await prisma.assessmentEpisode.findFirst({
    where: { id, clinicianId },
    include: episodeInclude,
  });
  if (!row) return null;
  return row.modules.map((m) => ({
    id: m.id,
    moduleKey: m.moduleKey,
    moduleVersion: m.moduleVersion,
    audience: m.audience,
    status: m.status,
    answeredCount: m.responses.length,
  }));
}

export async function acceptSessionConsent(token: string): Promise<EpisodeRecord | null> {
  const row = await prisma.assessmentEpisode.findFirst({
    where: { modules: { some: { token } } },
    include: episodeInclude,
  });
  const clientMod = row ? clientModule(row) : null;
  if (!row || !clientMod || row.status !== "DRAFT" || clientMod.revokedAt) return null;

  await prisma.moduleInstance.update({
    where: { id: clientMod.id },
    data: { consentAcceptedAt: new Date(), status: "IN_PROGRESS" },
  });

  await logSessionEvent(row.id, "intake.consent_accepted", { actorType: "client" });
  return loadEpisodeById(row.id);
}

export async function updateSessionAnswers(
  token: string,
  answers: AssessmentAnswers,
): Promise<EpisodeRecord | null> {
  const row = await prisma.assessmentEpisode.findFirst({
    where: { modules: { some: { token } } },
    include: episodeInclude,
  });
  const clientMod = row ? clientModule(row) : null;
  if (!row || !clientMod || row.status !== "DRAFT" || clientMod.revokedAt) return null;
  if (!clientMod.consentAcceptedAt) return null;

  await replaceModuleResponses(clientMod.id, answers);
  await prisma.moduleInstance.update({
    where: { id: clientMod.id },
    data: { status: "IN_PROGRESS" },
  });
  return loadEpisodeById(row.id);
}

export async function submitSession(
  token: string,
  answers?: AssessmentAnswers,
): Promise<EpisodeRecord | null> {
  const row = await prisma.assessmentEpisode.findFirst({
    where: { modules: { some: { token } } },
    include: episodeInclude,
  });
  const clientMod = row ? clientModule(row) : null;
  if (!row || !clientMod || row.status !== "DRAFT" || clientMod.revokedAt) return null;
  if (!clientMod.consentAcceptedAt) return null;

  if (answers !== undefined) {
    await replaceModuleResponses(clientMod.id, answers);
  }

  const now = new Date();
  await prisma.moduleInstance.update({
    where: { id: clientMod.id },
    data: { status: "SUBMITTED", submittedAt: now },
  });
  await prisma.assessmentEpisode.update({
    where: { id: row.id },
    data: { status: "SUBMITTED", submittedAt: now },
  });

  await logSessionEvent(row.id, "intake.submitted", { actorType: "client" });
  return loadEpisodeById(row.id);
}

export async function updateSessionReview(
  id: string,
  clinicianId: string,
  input: UpdateSessionReviewInput,
): Promise<EpisodeRecord | null> {
  const existing = await prisma.assessmentEpisode.findFirst({ where: { id, clinicianId } });
  if (!existing || existing.status === "DRAFT") return null;
  if (existing.reportFinalizedAt && (input.reportDraft !== undefined || input.overrides)) {
    return null;
  }

  await prisma.assessmentEpisode.update({
    where: { id },
    data: {
      ...(input.overrides !== undefined ? { overrides: input.overrides } : {}),
      ...(input.clinicianNotes !== undefined ? { clinicianNotes: input.clinicianNotes } : {}),
      ...(input.reportDraft !== undefined ? { reportDraft: input.reportDraft } : {}),
      ...(input.reportFinal !== undefined ? { reportFinal: input.reportFinal } : {}),
      ...(input.reportFinalized
        ? {
            reportFinal: input.reportFinal ?? existing.reportDraft ?? existing.reportFinal,
            reportFinalizedAt: new Date(),
          }
        : {}),
      ...(input.status === "REVIEWED" ? { status: "REVIEWED", reviewedAt: new Date() } : {}),
    },
  });
  return loadEpisodeById(id);
}

export async function saveSessionReport(
  id: string,
  clinicianId: string,
  reportDraft: string,
  generatedAt: Date = new Date(),
): Promise<EpisodeRecord | null> {
  const existing = await prisma.assessmentEpisode.findFirst({ where: { id, clinicianId } });
  if (!existing || existing.status === "DRAFT" || existing.reportFinalizedAt) return null;

  await prisma.assessmentEpisode.update({
    where: { id },
    data: { reportDraft, reportGeneratedAt: generatedAt },
  });
  return loadEpisodeById(id);
}

export async function revokeSessionToken(
  id: string,
  clinicianId: string,
): Promise<EpisodeRecord | null> {
  const row = await prisma.assessmentEpisode.findFirst({
    where: { id, clinicianId },
    include: episodeInclude,
  });
  const clientMod = row ? clientModule(row) : null;
  if (!row || !clientMod) return null;

  await prisma.moduleInstance.update({
    where: { id: clientMod.id },
    data: { revokedAt: new Date() },
  });
  await logSessionEvent(row.id, "session.token_revoked", {
    actorType: "clinician",
    actorId: clinicianId,
  });
  return loadEpisodeById(row.id);
}

export async function extendSessionToken(
  id: string,
  clinicianId: string,
  days = DEFAULT_TOKEN_EXPIRY_DAYS,
): Promise<EpisodeRecord | null> {
  const row = await prisma.assessmentEpisode.findFirst({
    where: { id, clinicianId },
    include: episodeInclude,
  });
  const clientMod = row ? clientModule(row) : null;
  if (!row || !clientMod) return null;

  const tokenExpiresAt = new Date();
  tokenExpiresAt.setDate(tokenExpiresAt.getDate() + days);

  await prisma.moduleInstance.update({
    where: { id: clientMod.id },
    data: { tokenExpiresAt, revokedAt: null },
  });
  await logSessionEvent(row.id, "session.token_extended", {
    actorType: "clinician",
    actorId: clinicianId,
    metadata: { expiresAt: tokenExpiresAt.toISOString() },
  });
  return loadEpisodeById(row.id);
}

export async function markSessionNotified(id: string): Promise<void> {
  await prisma.assessmentEpisode.update({
    where: { id },
    data: { notifiedAt: new Date() },
  });
}
