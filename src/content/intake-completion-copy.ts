/** Completion and post-submit journey copy */

export const INTAKE_COMPLETION_ARC_TITLE = "What you explored";

export const INTAKE_COMPLETION_ARC_INTRO =
  "Over nine chapters, you moved through different parts of your experience. Each one adds context your clinician will bring into conversation with you.";

export const INTAKE_COMPLETION_COLLABORATION_TITLE = "What happens next";

export const INTAKE_COMPLETION_COLLABORATION_BODY =
  "Your clinician will read what you've shared before you meet. This isn't a diagnosis or a verdict — it's the beginning of a conversation where your experience is taken seriously.";

export const INTAKE_COMPLETION_REFLECTIONS_NOTE = (count: number) =>
  count === 1
    ? "You also left a personal reflection along the way."
    : `You also left ${count} personal reflections along the way.`;

export const INTAKE_COMPLETION_CLOSING =
  "However this process felt — rushed, revealing, tiring, or clarifying — what you shared has value. You don't have to have it all figured out yet.";
