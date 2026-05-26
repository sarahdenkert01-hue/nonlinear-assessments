import { logSessionEvent } from "@/lib/audit";
import type { AssessmentSessionRecord } from "@/lib/sessions";
import { markSessionNotified } from "@/lib/sessions";

/**
 * Notify clinician when a client submits intake.
 * Set NOTIFY_EMAIL or RESEND_API_KEY + NOTIFY_FROM for production email.
 */
export async function notifyClinicianOnSubmission(
  session: AssessmentSessionRecord,
): Promise<void> {
  if (!session.clinicianId || session.notifiedAt) return;

  const reviewUrl =
    process.env.NEXT_PUBLIC_APP_URL &&
    `${process.env.NEXT_PUBLIC_APP_URL}/cases/${session.id}/assessment`;

  const clientLabel = session.clientName ?? "A client";
  const subject = `Intake submitted: ${clientLabel}`;
  const body = [
    `${clientLabel} has submitted their questionnaire.`,
    reviewUrl ? `Review: ${reviewUrl}` : `Session ID: ${session.id}`,
  ].join("\n\n");

  const sent = await sendNotificationEmail({
    to: process.env.NOTIFY_EMAIL,
    subject,
    body,
  });

  if (sent) {
    await markSessionNotified(session.id);
    await logSessionEvent(session.id, "session.notification_sent", {
      actorType: "system",
      metadata: { channel: "email" },
    });
  } else if (process.env.NODE_ENV === "development") {
    console.info("[notify] intake submitted:", subject, body);
    await markSessionNotified(session.id);
    await logSessionEvent(session.id, "session.notification_sent", {
      actorType: "system",
      metadata: { channel: "console" },
    });
  }
}

async function sendNotificationEmail(input: {
  to: string | undefined;
  subject: string;
  body: string;
}): Promise<boolean> {
  if (!input.to?.trim()) return false;

  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_FROM ?? "onboarding@resend.dev";

  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [input.to.trim()],
          subject: input.subject,
          text: input.body,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  return false;
}
