/** Submit confirmation copy (final step before sharing with clinician). */

export const SUBMIT_CONFIRM_TITLE = "Ready to share with your clinician?";

export const SUBMIT_CONFIRM_BODY =
  "You can still go back and change anything. Once you share, your clinician will read your responses before your conversation.";

export const SUBMIT_CONFIRM_CTA = "Yes, share now";

export const SUBMIT_CONFIRM_BACK = "Keep exploring";

/** Single-question flow copy */
export function questionInChapterLabel(current: number, total: number): string {
  return `${current} of ${total} in this chapter`;
}
