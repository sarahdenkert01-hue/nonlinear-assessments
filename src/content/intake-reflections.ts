/** Optional per-chapter reflection prompts (client-facing). Order matches assessment sections. */

export const CHAPTER_REFLECTION_PROMPTS = [
  "What feels most true about how you move through the world?",
  "Is there anything about focus or getting things done you wish people understood?",
  "What does your body or nervous system need that others might not notice?",
  "What surprised you as you reflected on your emotions?",
  "Is there anything about your social life you wish people understood better?",
  "What helps you recover when your energy is depleted?",
  "What feels most true about your sense of self right now?",
  "What from your story feels important to mention, even briefly?",
  "What feels most important to say in your own words?",
] as const;

export function getChapterReflectionPrompt(chapterIndex: number): string {
  return CHAPTER_REFLECTION_PROMPTS[chapterIndex] ?? CHAPTER_REFLECTION_PROMPTS[0];
}

export const REFLECTION_OPTIONAL_LABEL = "Optional reflection";

export const REFLECTION_OPTIONAL_HINT =
  "Share only if something comes to mind — you can leave this blank.";

export const REFLECTION_SKIP_CTA = "Skip for now";

export const REFLECTION_CONTINUE_CTA = "Continue";
