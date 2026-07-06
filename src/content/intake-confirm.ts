/** Submit confirmation copy (final step before sharing with clinician). */

export const SUBMIT_CONFIRM_TITLE = "Ready to share with your clinician?";

export const SUBMIT_CONFIRM_BODY =
  "You can still go back and change anything. Sharing sends your responses to your clinician — they'll read them before your conversation, not instead of it.";

export const SUBMIT_CONFIRM_CTA = "Yes, share now";

export const SUBMIT_CONFIRM_BACK = "Not yet — keep exploring";

export function questionInChapterLabel(current: number, total: number): string {
  return `Question ${current} of ${total}`;
}
