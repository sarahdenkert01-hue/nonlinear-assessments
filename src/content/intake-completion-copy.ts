/** Completion and post-submit journey copy */

export const INTAKE_COMPLETION_COLLABORATION_TITLE = "What happens next";

export const INTAKE_COMPLETION_COLLABORATION_BODY =
  "This isn't a diagnosis or a score — it's context for a conversation. Your clinician will bring your words into the room with you, not read them instead of meeting you.";

export const INTAKE_COMPLETION_REFLECTIONS_NOTE = (count: number) =>
  count === 1
    ? "You also left an optional reflection along the way."
    : `You also left ${count} optional reflections along the way.`;

export const INTAKE_COMPLETION_CLOSING =
  "However this felt — tiring, revealing, or somewhere in between — what you shared matters. You don't need to have it all figured out yet.";
