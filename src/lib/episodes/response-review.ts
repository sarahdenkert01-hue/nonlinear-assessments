import { QUESTIONS } from "@/features/assessments/data/questions";
import {
  isAssessmentQuestion,
  isSectionMarker,
  type AssessmentAnswers,
} from "@/features/assessments/types";
import {
  isReflectionKey,
  reflectionKey,
} from "@/features/assessments/lib/reflections";
import { buildSections } from "@/features/assessments/lib/scoring";
import {
  GUIDED_REFLECTION_SECTIONS,
  MODULE_KEYS,
  getModuleDefinition,
  parseGuidedReflectionData,
  parseLifeMapData,
} from "@/lib/modules";
import type { Prisma } from "@prisma/client";
import { responsesToAnswers, responsesToModuleData } from "./responses";

export type ResponseReviewItem = {
  itemId: string;
  prompt: string;
  answer: string;
  unanswered: boolean;
  /** When true, preserve line breaks in the UI. */
  multiline: boolean;
};

export type ModuleResponseReview = {
  moduleKey: string;
  moduleVersion: string;
  title: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "COMPLETED";
  submittedAt: string | null;
  answeredCount: number;
  totalPromptCount: number;
  items: ResponseReviewItem[];
};

export type EpisodeResponseReview = {
  episodeId: string;
  modules: ModuleResponseReview[];
  totalResponses: number;
  submittedModuleCount: number;
};

type ModuleRow = {
  moduleKey: string;
  moduleVersion: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "COMPLETED";
  submittedAt: Date | null;
  audience: "CLIENT" | "CLINICIAN";
  responses: { itemId: string; value: Prisma.JsonValue }[];
};

function displayAnswer(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function buildScreenerItems(answers: AssessmentAnswers): ResponseReviewItem[] {
  const items: ResponseReviewItem[] = [];
  const sections = buildSections();

  for (const q of QUESTIONS) {
    if (isSectionMarker(q)) continue;
    if (!isAssessmentQuestion(q)) continue;
    const raw = answers[q.id];
    const answer = typeof raw === "string" ? raw.trim() : displayAnswer(raw).trim();
    items.push({
      itemId: q.id,
      prompt: q.text,
      answer,
      unanswered: !answer,
      multiline: q.format === "open",
    });
  }

  // Chapter reflections stored as reflection:N
  for (let i = 0; i < sections.length; i++) {
    const key = reflectionKey(i);
    const raw = answers[key];
    if (raw === undefined) continue;
    const answer = typeof raw === "string" ? raw.trim() : displayAnswer(raw).trim();
    items.push({
      itemId: key,
      prompt: `Chapter reflection — ${sections[i]?.title ?? `Chapter ${i + 1}`}`,
      answer,
      unanswered: !answer,
      multiline: true,
    });
  }

  // Any other keys (forward-compatible)
  const known = new Set(items.map((i) => i.itemId));
  for (const [itemId, raw] of Object.entries(answers)) {
    if (known.has(itemId) || isReflectionKey(itemId)) continue;
    const answer = typeof raw === "string" ? raw.trim() : displayAnswer(raw).trim();
    items.push({
      itemId,
      prompt: itemId,
      answer,
      unanswered: !answer,
      multiline: answer.includes("\n"),
    });
  }

  return items;
}

function buildGuidedReflectionItems(data: Record<string, unknown>): ResponseReviewItem[] {
  const parsed = parseGuidedReflectionData(data);
  return GUIDED_REFLECTION_SECTIONS.map((section) => {
    const answer = (parsed[section.key] ?? "").trim();
    return {
      itemId: section.key,
      prompt: `${section.title}\n${section.prompt}`,
      answer,
      unanswered: !answer,
      multiline: true,
    };
  });
}

function buildLifeMapItems(data: Record<string, unknown>): ResponseReviewItem[] {
  const { entries } = parseLifeMapData(data);
  if (entries.length === 0) {
    return [
      {
        itemId: "entries",
        prompt: "Timeline entries",
        answer: "",
        unanswered: true,
        multiline: false,
      },
    ];
  }

  const items: ResponseReviewItem[] = [];
  for (const [index, entry] of entries.entries()) {
    const label =
      entry.title || entry.lifeStage || `Entry ${index + 1}`;
    const fields: [string, string][] = [
      ["Life stage", entry.lifeStage],
      ["Title", entry.title],
      ["What was happening", entry.description],
      ["What felt supportive or easier", entry.supportive],
      ["What felt difficult or confusing", entry.difficult],
      ["Ways adapted or coped", entry.adapted],
      ["How this may still affect them now", entry.affectsNow],
      ["Tags", entry.tags.join(", ")],
    ];
    for (const [field, value] of fields) {
      const answer = value.trim();
      items.push({
        itemId: `${entry.id}:${field}`,
        prompt: `${label} — ${field}`,
        answer,
        unanswered: !answer,
        multiline: field !== "Life stage" && field !== "Title" && field !== "Tags",
      });
    }
  }
  return items;
}

export function buildEpisodeResponseReview(
  episodeId: string,
  modules: ModuleRow[],
): EpisodeResponseReview {
  const clientModules = modules
    .filter((m) => m.audience === "CLIENT")
    .sort((a, b) => {
      const ao = getModuleDefinition(a.moduleKey)?.displayOrder ?? 99;
      const bo = getModuleDefinition(b.moduleKey)?.displayOrder ?? 99;
      return ao - bo;
    });

  const reviewed: ModuleResponseReview[] = clientModules.map((m) => {
    const def = getModuleDefinition(m.moduleKey);
    let items: ResponseReviewItem[] = [];

    if (m.moduleKey === MODULE_KEYS.SCREENER) {
      items = buildScreenerItems(responsesToAnswers(m.responses));
    } else if (m.moduleKey === MODULE_KEYS.GUIDED_REFLECTION) {
      items = buildGuidedReflectionItems(responsesToModuleData(m.responses));
    } else if (m.moduleKey === MODULE_KEYS.LIFE_MAP) {
      items = buildLifeMapItems(responsesToModuleData(m.responses));
    } else {
      const data = responsesToModuleData(m.responses);
      items = Object.entries(data).map(([itemId, value]) => {
        const answer = displayAnswer(value).trim();
        return {
          itemId,
          prompt: itemId,
          answer,
          unanswered: !answer,
          multiline: answer.includes("\n"),
        };
      });
    }

    const answeredCount = items.filter((i) => !i.unanswered).length;
    return {
      moduleKey: m.moduleKey,
      moduleVersion: m.moduleVersion,
      title: def?.title ?? m.moduleKey,
      status: m.status,
      submittedAt: m.submittedAt?.toISOString() ?? null,
      answeredCount,
      totalPromptCount: items.length,
      items,
    };
  });

  return {
    episodeId,
    modules: reviewed,
    totalResponses: clientModules.reduce((n, m) => n + m.responses.length, 0),
    submittedModuleCount: clientModules.filter(
      (m) => m.status === "SUBMITTED" || m.status === "COMPLETED",
    ).length,
  };
}
