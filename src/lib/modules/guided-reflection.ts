import type { GuidedReflectionData, GuidedReflectionSectionKey } from "./types";

export interface GuidedReflectionSection {
  key: GuidedReflectionSectionKey;
  title: string;
  prompt: string;
}

export const GUIDED_REFLECTION_SECTIONS: GuidedReflectionSection[] = [
  {
    key: "patterns",
    title: "Patterns I have noticed",
    prompt:
      "Are there ways of thinking, feeling, or relating that seem to show up again and again for you? Share whatever feels useful — there is no right answer.",
  },
  {
    key: "difficult-to-explain",
    title: "Experiences that are difficult to explain",
    prompt:
      "Some experiences are hard to put into words, or hard for others to understand. What feels important to name here, even if it is incomplete?",
  },
  {
    key: "adaptations",
    title: "Ways I have learned to adapt",
    prompt:
      "Over time, people often find ways to get through, cope, or make life work. What strategies, supports, or habits have helped you?",
  },
  {
    key: "what-others-may-not-see",
    title: "What others may not see",
    prompt:
      "What parts of your experience tend to stay invisible — effort that looks easy from the outside, or things you manage privately?",
  },
  {
    key: "hopes",
    title: "What I hope this assessment helps clarify",
    prompt:
      "What would feel most helpful to understand better through this process? What questions are you bringing?",
  },
];

const SECTION_KEYS = new Set(
  GUIDED_REFLECTION_SECTIONS.map((s) => s.key),
);

export function parseGuidedReflectionData(raw: unknown): GuidedReflectionData {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: GuidedReflectionData = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!SECTION_KEYS.has(key as GuidedReflectionSectionKey)) continue;
    if (typeof value === "string") {
      out[key as GuidedReflectionSectionKey] = value;
    }
  }
  return out;
}

export function validateGuidedReflectionData(raw: unknown): GuidedReflectionData | null {
  try {
    return parseGuidedReflectionData(raw);
  } catch {
    return null;
  }
}
