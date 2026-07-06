/** Encouraging chapter copy for the client exploration flow. Order matches assessment sections. */

export const INTAKE_TOTAL_MINUTES = 25;

export const INTAKE_MINUTES_PER_CHAPTER = 3;

export type ChapterContent = {
  progressMessage: string;
  intro: string;
  completionMessage: string;
  bridgeFromPrevious?: string;
  transitionToNext?: string;
};

export const CHAPTER_CONTENT: ChapterContent[] = [
  {
    progressMessage: "We're learning how you experience the world around you.",
    intro:
      "This chapter looks at how you show up in different settings — and what it costs you to adapt. There is no single right way to move through the world.",
    completionMessage:
      "What you shared about how you move through the world adds real texture to your picture.",
    transitionToNext:
      "Next, we'll explore how your mind handles focus, tasks, and mental energy.",
  },
  {
    progressMessage: "Now we're exploring how your brain processes information.",
    bridgeFromPrevious:
      "You've shared how you move through the world. Now we'll look at focus, mental energy, and getting things done.",
    intro:
      "This chapter is about the rhythms of your attention — starting tasks, sustaining focus, and the effort it takes to keep up.",
    completionMessage:
      "How you think and get things done is rarely visible to others. What you named here matters.",
    transitionToNext:
      "From here, we'll turn toward your body and nervous system — sensation, environment, and how you respond.",
  },
  {
    progressMessage: "We're looking at how your nervous system experiences the world.",
    bridgeFromPrevious:
      "Building on what you've shared so far, we'll explore how your body responds to sensation and environment.",
    intro:
      "This chapter is about physical experience — comfort, overload, and the signals your body sends that others may not notice.",
    completionMessage:
      "Your body's signals are an important part of your story, and you named them clearly.",
    transitionToNext:
      "Next, we'll explore how you experience and process emotions.",
  },
  {
    progressMessage: "We're exploring how you experience and handle emotions.",
    bridgeFromPrevious:
      "You've covered a lot of ground. Now we'll look at feelings — how they arise, how you process them, and how they show up day to day.",
    intro:
      "This chapter invites you to reflect on emotional life — intensity, expression, and the ways you make sense of what you feel.",
    completionMessage:
      "Emotional experience is rarely simple. What you shared here adds depth, not judgment.",
    transitionToNext:
      "Up next: relationships, connection, and the social world — including the parts that feel easy and the parts that don't.",
  },
  {
    progressMessage: "We're exploring your social experiences and relationships.",
    bridgeFromPrevious:
      "You're halfway through. What you've shared is already building a fuller picture — pause here if you need a moment.",
    intro:
      "This chapter is about connection — friendship, belonging, and the social situations that energize or drain you.",
    completionMessage:
      "Social life looks different for everyone. What you described helps your clinician understand your context.",
    transitionToNext:
      "Next, we'll look at energy, burnout, and what recovery looks like for you.",
  },
  {
    progressMessage: "We're exploring your energy, burnout, and resilience.",
    bridgeFromPrevious:
      "With more than half behind you, we'll now look at the patterns of your energy — what depletes you and what helps you come back.",
    intro:
      "This chapter looks at sustainability — how hard you push, how you recover, and what happens when your reserves run low.",
    completionMessage:
      "Naming your energy patterns takes honesty. That clarity is valuable for your clinician.",
    transitionToNext:
      "From here, we'll explore identity — how you understand yourself and your place in the world.",
  },
  {
    progressMessage: "We're exploring your sense of self and identity.",
    bridgeFromPrevious:
      "You're in the final stretch. A few more chapters, then space for your own words.",
    intro:
      "This chapter is about self-understanding — who you are, how you see yourself, and the parts of your identity that feel settled or still forming.",
    completionMessage:
      "A sense of self is something many people spend years untangling. What you shared is a meaningful piece of that.",
    transitionToNext:
      "Next, we'll step back to look at the broader patterns in your story so far.",
  },
  {
    progressMessage: "We're bringing your broader story into view.",
    bridgeFromPrevious:
      "Almost there. This chapter looks at the larger patterns and experiences that shape who you are today.",
    intro:
      "This chapter steps back — life experiences, patterns you've noticed, and context that helps situate everything else.",
    completionMessage:
      "Your history is part of your picture, not all of it. What you named here gives your clinician important context.",
    transitionToNext:
      "Finally, open space for anything the earlier chapters didn't capture — in your own words.",
  },
  {
    progressMessage: "This is your space to bring everything together.",
    bridgeFromPrevious:
      "You've moved through eight chapters. This last one is entirely yours — whatever feels important to say.",
    intro:
      "There are no prompts to score here. Share what matters to you — difficulties, strengths, or anything you want your clinician to know.",
    completionMessage:
      "What you wrote in your own words gives your clinician something no checklist could capture.",
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

export function getJourneyMilestone(
  sectionIndex: number,
  totalSections: number,
): string | null {
  if (sectionIndex === Math.floor(totalSections / 2)) {
    return "You're halfway through — what you've shared is already shaping a real picture.";
  }
  if (sectionIndex === totalSections - 2) {
    return "Nearly there. One more chapter after this, then your own words.";
  }
  return null;
}

export const CHAPTER_INTRO_CTA = "Begin this chapter";

export const CHAPTER_CONTINUE_CTA = "Continue";

export const CHAPTER_COMPLETE_CTA = "Continue";

export const CHAPTER_PREVIOUS_CTA = "Back";
