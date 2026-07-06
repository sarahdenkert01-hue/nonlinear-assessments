/** Encouraging chapter copy for the client exploration flow. Order matches assessment sections. */

export const INTAKE_TOTAL_MINUTES = 25;

export const INTAKE_MINUTES_PER_CHAPTER = 3;

export type ChapterContent = {
  progressMessage: string;
  intro: string;
  completionMessage: string;
};

export const CHAPTER_CONTENT: ChapterContent[] = [
  {
    progressMessage: "You're exploring how you move through the world.",
    intro:
      "This chapter looks at how you show up in different settings — and what it costs you to adapt. Take your time; there is no single right way to experience this.",
    completionMessage:
      "Thank you for sharing. We're building a fuller picture of how you navigate the world.",
  },
  {
    progressMessage: "You're exploring how you think and get things done.",
    intro:
      "This chapter is about focus, mental energy, and the ways you manage tasks and ideas. Answer based on what feels most true over the past several months.",
    completionMessage:
      "Thank you for sharing. Every experience adds another piece to the puzzle.",
  },
  {
    progressMessage: "You're exploring how your body and nervous system respond.",
    intro:
      "This chapter is about physical sensations, your environment, and how your body experiences the world around you.",
    completionMessage:
      "Thank you for sharing. Your body's signals are an important part of your story.",
  },
  {
    progressMessage: "You're exploring how you experience and process emotions.",
    intro:
      "This chapter invites you to reflect on feelings — how they arise, how you handle them, and how they show up in daily life.",
    completionMessage:
      "Thank you for sharing. Emotional experiences are rarely simple, and yours matter.",
  },
  {
    progressMessage: "You're exploring your social experiences.",
    intro:
      "This chapter is about relationships, connection, and the social world — including the parts that feel easy and the parts that don't.",
    completionMessage:
      "Thank you for sharing. Social life looks different for everyone.",
  },
  {
    progressMessage: "You're exploring your energy and resilience.",
    intro:
      "This chapter looks at burnout, recovery, and the rhythms of your energy — what drains you and what helps you come back.",
    completionMessage:
      "Thank you for sharing. Understanding your energy patterns takes honesty.",
  },
  {
    progressMessage: "You're exploring your sense of self.",
    intro:
      "This chapter is about identity — how you understand yourself and your place in the world. There are no right or wrong answers here.",
    completionMessage:
      "Thank you for sharing. A sense of self is something many people spend years untangling.",
  },
  {
    progressMessage: "You're exploring your story so far.",
    intro:
      "This chapter steps back to look at broader life experiences — patterns, history, and context that shape who you are today.",
    completionMessage:
      "Thank you for sharing. Your history is part of your picture, not all of it.",
  },
  {
    progressMessage: "You're sharing in your own words.",
    intro:
      "This final chapter is open space for anything the earlier topics didn't capture. Share what feels important — in as much or as little detail as you'd like.",
    completionMessage:
      "Thank you for sharing. What you've written here gives your clinician valuable context.",
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

export const CHAPTER_INTRO_CTA = "Begin this chapter";

export const CHAPTER_CONTINUE_CTA = "Continue";

export const CHAPTER_COMPLETE_CTA = "Continue to next chapter";

export const CHAPTER_PREVIOUS_CTA = "Previous";
