/** Encouraging chapter copy for the client exploration flow. Order matches assessment sections. */

export const INTAKE_TOTAL_MINUTES = 25;

export const INTAKE_MINUTES_PER_CHAPTER = 3;

export type ChapterContent = {
  progressMessage: string;
  /** Why these questions matter — one short paragraph. */
  intro: string;
  /** What the client will be asked — one practical sentence. */
  whatToExpect: string;
  /** Brief handoff from the previous chapter (shown on intro, not a separate screen). */
  bridgeFromPrevious?: string;
};

export const CHAPTER_CONTENT: ChapterContent[] = [
  {
    progressMessage: "Understanding how you move through the world.",
    intro:
      "How you adapt in different settings shapes your daily life. These questions help your clinician see that context — not judge it.",
    whatToExpect:
      "You'll be asked how you present yourself in different situations and what it costs you to adapt.",
  },
  {
    progressMessage: "Exploring attention and mental energy.",
    bridgeFromPrevious:
      "You've shared how you move through the world. Next we'll explore attention and mental energy.",
    intro:
      "Focus and getting things done look different for everyone. This chapter maps your patterns over the past several months.",
    whatToExpect:
      "You'll answer questions about starting tasks, sustaining focus, and mental effort.",
  },
  {
    progressMessage: "Looking at your body and nervous system.",
    bridgeFromPrevious:
      "You've covered focus and mental energy. Next we'll look at how your body responds to sensation and environment.",
    intro:
      "Physical comfort and overload are part of how you experience the world. Your clinician needs this picture too.",
    whatToExpect:
      "You'll be asked about physical sensations, your environment, and how your body responds.",
  },
  {
    progressMessage: "Exploring emotions and how you handle them.",
    bridgeFromPrevious:
      "You've shared how your body experiences the world. Next we'll turn to emotions.",
    intro:
      "Emotional life is rarely simple. These questions help your clinician understand how feelings show up for you day to day.",
    whatToExpect:
      "You'll reflect on how you experience, process, and express emotions.",
  },
  {
    progressMessage: "Exploring social experiences and relationships.",
    bridgeFromPrevious:
      "You're halfway through — what you've shared is already building a picture. Next: relationships and social life.",
    intro:
      "Connection and belonging matter. This chapter looks at the social situations that energize or drain you.",
    whatToExpect:
      "You'll answer questions about relationships and how you experience social situations.",
  },
  {
    progressMessage: "Exploring energy, burnout, and recovery.",
    bridgeFromPrevious:
      "You've described your social world. Next we'll look at energy — what depletes you and what helps you recover.",
    intro:
      "Sustainability matters. These questions map how hard you push, how you recover, and what happens when reserves run low.",
    whatToExpect:
      "You'll be asked about your overall energy, resilience, and recovery.",
  },
  {
    progressMessage: "Exploring identity and sense of self.",
    bridgeFromPrevious:
      "You've named your energy patterns. Next we'll look at how you understand yourself.",
    intro:
      "Self-understanding takes time. This chapter invites you to reflect on who you are and how you see your place in the world.",
    whatToExpect:
      "You'll answer questions about identity — there are no right or wrong answers here.",
  },
  {
    progressMessage: "Bringing your broader story into view.",
    bridgeFromPrevious:
      "Almost there. Next we'll step back to the larger patterns in your story.",
    intro:
      "Life experiences and patterns you've noticed help situate everything else. This chapter looks at the bigger picture.",
    whatToExpect:
      "A few broader questions about your experiences and the patterns you've noticed along the way.",
  },
  {
    progressMessage: "Your space to share in your own words.",
    bridgeFromPrevious:
      "You've moved through eight chapters. This last one is open — whatever feels important to say.",
    intro:
      "Some things don't fit a checklist. This chapter gives you room to share what matters most to you.",
    whatToExpect:
      "Open questions — share difficulties, strengths, or anything you want your clinician to know.",
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

export const CHAPTER_PREVIOUS_CTA = "Back";

export const CHAPTER_COMPLETE_ACK = "Chapter complete";
