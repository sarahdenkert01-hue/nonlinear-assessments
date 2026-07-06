/** Submit confirmation copy (final step before sharing with clinician). */

export const SUBMIT_CONFIRM_TITLE = "Ready to share?";

export const SUBMIT_CONFIRM_BODY =
  "You can still go back and change anything before sharing. Your clinician will read these responses before you meet — as a starting point, not a final word.";

export const SUBMIT_CONFIRM_CTA = "Share with my clinician";

export const SUBMIT_CONFIRM_BACK = "Keep reviewing";

export function questionInChapterLabel(current: number, total: number): string {
  return `Question ${current} of ${total}`;
}
