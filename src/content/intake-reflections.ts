/** Optional per-chapter reflection prompts (client-facing). Order matches assessment sections. */

const REFLECTION_PROMPT_VARIANTS = [
  "Did any of these questions stand out to you?",
  "Is there anything you'd like your clinician to understand before moving on?",
  "Anything you'd like to add in your own words?",
] as const;

export const CHAPTER_REFLECTION_PROMPTS = [
  REFLECTION_PROMPT_VARIANTS[0],
  REFLECTION_PROMPT_VARIANTS[1],
  REFLECTION_PROMPT_VARIANTS[2],
  REFLECTION_PROMPT_VARIANTS[0],
  REFLECTION_PROMPT_VARIANTS[1],
  REFLECTION_PROMPT_VARIANTS[2],
  REFLECTION_PROMPT_VARIANTS[0],
  REFLECTION_PROMPT_VARIANTS[1],
  REFLECTION_PROMPT_VARIANTS[2],
] as const;

export function getChapterReflectionPrompt(chapterIndex: number): string {
  return CHAPTER_REFLECTION_PROMPTS[chapterIndex] ?? CHAPTER_REFLECTION_PROMPTS[0];
}

export const REFLECTION_KICKER = "Before we continue…";

export const REFLECTION_OPTIONAL_HINT =
  "This is optional — skip it anytime, or leave it blank.";

export const REFLECTION_SKIP_CTA = "Skip";

export const REFLECTION_CONTINUE_CTA = "Continue";
