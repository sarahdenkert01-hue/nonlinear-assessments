import { randomUUID } from "crypto";
import type { ClinicalQuestionPrompt } from "./types";

export function normalizeQuestionText(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

export function parseQuestionsFromText(text: string): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  for (const line of text.split("\n")) {
    const cleaned = line.replace(/^[\s•\-*\d.)]+/, "").trim();
    if (!cleaned || cleaned.length < 8) continue;
    if (/^suggested clinical questions/i.test(cleaned)) continue;
    if (/^these are interview prompts/i.test(cleaned)) continue;
    if (/^ignore any that/i.test(cleaned)) continue;

    const key = normalizeQuestionText(cleaned);
    if (!seen.has(key)) {
      seen.add(key);
      results.push(cleaned);
    }
  }

  return results;
}

export function createQuestionPrompt(text: string): ClinicalQuestionPrompt {
  return {
    id: randomUUID(),
    text: text.trim(),
    askedAt: null,
    note: null,
  };
}

export function mergeQuestionPrompts(
  existing: ClinicalQuestionPrompt[],
  newTexts: string[],
  replaceAll: boolean,
): ClinicalQuestionPrompt[] {
  if (replaceAll) {
    return newTexts.map((text) => createQuestionPrompt(text));
  }

  const seen = new Set(existing.map((q) => normalizeQuestionText(q.text)));
  const merged = [...existing];

  for (const text of newTexts) {
    const key = normalizeQuestionText(text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(createQuestionPrompt(text));
  }

  return merged;
}

export function parseClinicalQuestionPrompts(value: unknown): ClinicalQuestionPrompt[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const text = typeof row.text === "string" ? row.text.trim() : "";
      if (!text) return null;
      return {
        id: typeof row.id === "string" ? row.id : randomUUID(),
        text,
        askedAt: typeof row.askedAt === "string" ? row.askedAt : null,
        note: typeof row.note === "string" ? row.note : null,
      } satisfies ClinicalQuestionPrompt;
    })
    .filter((q): q is ClinicalQuestionPrompt => Boolean(q));
}

export function resolveClinicalQuestionPrompts(
  clinicalQuestionPrompts: unknown,
  suggestedQuestionsDraft: string | null,
): ClinicalQuestionPrompt[] {
  const fromJson = parseClinicalQuestionPrompts(clinicalQuestionPrompts);
  if (fromJson.length > 0) return fromJson;
  if (suggestedQuestionsDraft?.trim()) {
    return parseQuestionsFromText(suggestedQuestionsDraft).map((text) =>
      createQuestionPrompt(text),
    );
  }
  return [];
}

export function formatQuestionAsEvidenceNote(prompt: ClinicalQuestionPrompt): string {
  const parts = [`Interview prompt: ${prompt.text}`];
  if (prompt.note?.trim()) {
    parts.push(`Clinician note: ${prompt.note.trim()}`);
  }
  return parts.join("\n");
}
