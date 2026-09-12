/** Encouraging chapter copy for the client exploration flow. Order matches assessment sections. */

/** Overall expected duration for the full screener (same question set regardless of chapter count). */
export const INTAKE_TOTAL_MINUTES = 25;

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
    progressMessage: "Thinking and getting things done",
    introParagraphs: [
      "Every brain has its own rhythm for holding information, ordering steps, and sensing time.",
      "Some days ideas arrive faster than actions. Capacity can shift from one day to the next.",
      "This chapter explores how you manage tasks and mental energy — not whether you're productive enough.",
    ],
  },
  {
    progressMessage: "Getting started & keeping momentum",
    introParagraphs: [
      "Starting is its own kind of work.",
      "What unlocks action for you — interest, urgency, another person, rest — can change with the situation.",
      "These questions stay with initiation and momentum, without assuming a single explanation.",
    ],
  },
  {
    progressMessage: "Stopping, switching & getting unstuck",
    introParagraphs: [
      "Sometimes the hard part is not beginning, but shifting or stopping once you're in something.",
      "Interruptions can make it hard to find the thread again.",
      "This short chapter looks at transitions between activities.",
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

/**
 * Minutes for a stretch of questions, scaled to the full-assessment budget.
 * Reorganizing the same items into more/fewer chapters does not change the estimate.
 */
export function estimatedMinutesForQuestionCount(
  questionCount: number,
  totalQuestions: number,
): number {
  if (questionCount <= 0 || totalQuestions <= 0) return 1;
  return Math.max(
    1,
    Math.round((questionCount / totalQuestions) * INTAKE_TOTAL_MINUTES),
  );
}

/**
 * Remaining-time estimate from unanswered questions still ahead in the flow
 * (current question inclusive when `remainingQuestions` includes it).
 */
export function estimatedMinutesRemaining(
  remainingQuestions: number,
  totalQuestions: number = remainingQuestions,
): number {
  return Math.min(
    INTAKE_TOTAL_MINUTES,
    estimatedMinutesForQuestionCount(remainingQuestions, totalQuestions),
  );
}

export const CHAPTER_INTRO_CTA = "Begin chapter";

export const CHAPTER_CONTINUE_CTA = "Continue";

export const CHAPTER_PREVIOUS_CTA = "Back";
