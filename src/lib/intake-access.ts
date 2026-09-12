import type { ClientIntakeDTO } from "@/lib/episodes/client-intake-dto";
import type { SessionStatus } from "@/lib/episodes/types";

/** Minimal fields needed for intake access / consent checks (server or client DTO). */
export type IntakeAccessFields = {
  revokedAt: string | null;
  tokenExpiresAt: string | null;
  consentAcceptedAt?: string | null;
  status?: SessionStatus;
};

export type IntakeAccessDenial =
  | "not_found"
  | "revoked"
  | "expired"
  | "consent_required";

export function getIntakeAccessDenial(
  session: IntakeAccessFields | null,
): IntakeAccessDenial | null {
  if (!session) return "not_found";
  if (session.revokedAt) return "revoked";
  if (session.tokenExpiresAt && new Date(session.tokenExpiresAt) < new Date()) {
    return "expired";
  }
  return null;
}

export function canEditIntake(session: IntakeAccessFields): boolean {
  return session.status === "DRAFT" && !getIntakeAccessDenial(session);
}

export function hasConsent(
  session: Pick<ClientIntakeDTO, "consentAcceptedAt"> | IntakeAccessFields,
): boolean {
  return Boolean(session.consentAcceptedAt);
}
