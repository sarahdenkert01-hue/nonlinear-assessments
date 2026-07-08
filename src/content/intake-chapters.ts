/** Encouraging chapter copy for the client exploration flow. Order matches assessment sections. */

export const INTAKE_TOTAL_MINUTES = 25;

export const INTAKE_MINUTES_PER_CHAPTER = 3;

export type ChapterContent = {
  /** Quiet progress line — not a headline. */
  progressMessage: string;
  /** Book-like opening. Each chapter has its own tone. */
  introParagraphs: readonly string[];
};

export const CHAPTER_CONTENT: ChapterContent[] = [
  {
    progressMessage: "How you move through the world",
    introParagraphs: [
      "Most of us learn early how to read a room — what to show, what to hide, how much of yourself feels safe to bring.",
      "This chapter isn't about whether you do that well. It's about what it costs, and what it gives you.",
    ],
  },
  {
    progressMessage: "Attention and mental energy",
    introParagraphs: [
      "Every brain has its own rhythm.",
      "Some days ideas arrive faster than actions. Some tasks feel impossible until suddenly they aren't.",
      "This chapter explores how your attention moves — not whether you're productive enough.",
    ],
  },
  {
    progressMessage: "Your body and nervous system",
    introParagraphs: [
      "Long before you have words for it, your body is keeping track — of noise, of touch, of whether a space feels safe.",
      "What overwhelms you and what steadies you is worth naming. Not as a flaw, but as information.",
    ],
  },
  {
    progressMessage: "Emotions and how you handle them",
    introParagraphs: [
      "Feelings don't always arrive with labels. Sometimes they're loud. Sometimes they come late — hours after the moment that triggered them.",
      "We'll look at how emotion moves through you: intensity, expression, and what happens when there's too much or too little room for it.",
    ],
  },
  {
    progressMessage: "Connection and social life",
    introParagraphs: [
      "You're past the halfway point. What you've shared is already adding depth.",
      "Connection looks different for everyone — the friendships that sustain you, the rooms that drain you, the loneliness that no one sees.",
    ],
  },
  {
    progressMessage: "Energy, burnout, and recovery",
    introParagraphs: [
      "Effort has a cost. Even when you're keeping up, something may be running quietly in the background.",
      "This chapter is about the push and the recovery — what depletes you, and what actually helps you come back.",
    ],
  },
  {
    progressMessage: "Identity and sense of self",
    introParagraphs: [
      "Who you are rarely fits in a single box.",
      "Some parts feel settled. Others are still forming. Both belong in the picture.",
    ],
  },
  {
    progressMessage: "The broader picture",
    introParagraphs: [
      "Step back for a moment.",
      "The patterns you've noticed across years — what repeats, what changed, what you learned about yourself along the way.",
    ],
  },
  {
    progressMessage: "In your own words",
    introParagraphs: [
      "Some of the most important things don't fit a scale.",
      "This last chapter is open space — whatever you want your clinician to understand that the earlier chapters couldn't capture.",
    ],
  },
];

export function getChapterContent(sectionIndex: number): ChapterContent {
  return CHAPTER_CONTENT[sectionIndex] ?? CHAPTER_CONTENT[0];
}

export function estimatedMinutesRemaining(
  sectionIndex: number,
  totalSections: number,
): number {
  const remaining = Math.max(totalSections - sectionIndex, 1);
  return Math.min(
    INTAKE_TOTAL_MINUTES,
    Math.max(remaining * INTAKE_MINUTES_PER_CHAPTER, INTAKE_MINUTES_PER_CHAPTER),
  );
}

export const CHAPTER_INTRO_CTA = "Begin chapter";

export const CHAPTER_CONTINUE_CTA = "Continue";

export const CHAPTER_PREVIOUS_CTA = "Back";
