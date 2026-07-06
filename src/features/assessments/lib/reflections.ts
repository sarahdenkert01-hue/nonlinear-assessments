import { buildSections } from "./scoring";
import type { AssessmentAnswers } from "../types";

export const REFLECTION_KEY_PREFIX = "reflection:";

export function reflectionKey(chapterIndex: number): string {
  return `${REFLECTION_KEY_PREFIX}${chapterIndex}`;
}

export function isReflectionKey(key: string): boolean {
  return key.startsWith(REFLECTION_KEY_PREFIX);
}

export function parseReflectionChapterIndex(key: string): number | null {
  if (!isReflectionKey(key)) return null;
  const index = Number.parseInt(key.slice(REFLECTION_KEY_PREFIX.length), 10);
  return Number.isFinite(index) ? index : null;
}

export type ChapterReflection = {
  chapterIndex: number;
  chapterTitle: string;
  text: string;
};

/** Reflection entries with chapter titles, for clinician review. */
export function getChapterReflections(answers: AssessmentAnswers): ChapterReflection[] {
  const sections = buildSections();
  const entries: ChapterReflection[] = [];

  for (const [key, value] of Object.entries(answers)) {
    const chapterIndex = parseReflectionChapterIndex(key);
    const text = value?.trim();
    if (chapterIndex === null || !text) continue;
    entries.push({
      chapterIndex,
      chapterTitle: sections[chapterIndex]?.title ?? `Chapter ${chapterIndex + 1}`,
      text,
    });
  }

  return entries.sort((a, b) => a.chapterIndex - b.chapterIndex);
}
