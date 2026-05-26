import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AuditActorType = "client" | "clinician" | "system";

export async function logSessionEvent(
  sessionId: string,
  action: string,
  options?: {
    actorType?: AuditActorType;
    actorId?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await prisma.sessionEvent.create({
      data: {
        sessionId,
        action,
        actorType: options?.actorType ?? "system",
        actorId: options?.actorId ?? null,
        metadata: (options?.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[audit] failed to log event:", action, err);
    }
  }
}

export async function listSessionEvents(sessionId: string) {
  return prisma.sessionEvent.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "session.created": "Intake link created",
  "intake.consent_accepted": "Client accepted consent",
  "intake.answers_saved": "Client saved progress",
  "intake.submitted": "Client submitted questionnaire",
  "review.overrides_updated": "Clinician updated theme review",
  "review.notes_updated": "Clinician updated notes",
  "review.report_generated": "Report generated",
  "review.report_updated": "Report draft edited",
  "review.report_finalized": "Report finalized",
  "review.marked_reviewed": "Marked as reviewed",
  "session.token_revoked": "Intake link revoked",
  "session.token_extended": "Intake link expiry extended",
  "session.notification_sent": "Clinician notified of submission",
};
