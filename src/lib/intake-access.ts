import type { AssessmentSessionRecord } from "@/lib/sessions";

export type IntakeAccessDenial =
  | "not_found"
  | "revoked"
  | "expired"
  | "consent_required";

export function getIntakeAccessDenial(
  session: AssessmentSessionRecord | null,
): IntakeAccessDenial | null {
  if (!session) return "not_found";
  if (session.revokedAt) return "revoked";
  if (session.tokenExpiresAt && new Date(session.tokenExpiresAt) < new Date()) {
    return "expired";
  }
  return null;
}

export function canEditIntake(session: AssessmentSessionRecord): boolean {
  return session.status === "DRAFT" && !getIntakeAccessDenial(session);
}

export function hasConsent(session: AssessmentSessionRecord): boolean {
  return Boolean(session.consentAcceptedAt);
}
