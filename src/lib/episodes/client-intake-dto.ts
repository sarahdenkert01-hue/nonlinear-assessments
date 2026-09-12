import type { EpisodeRecord, SessionStatus } from "./types";

/**
 * Explicit allowlist of fields safe to serialize to token-authenticated clients.
 * Built field-by-field so newly added EpisodeRecord clinical fields stay private by default.
 */
export interface ClientIntakeDTO {
  token: string;
  clientName: string | null;
  status: SessionStatus;
  consentAcceptedAt: string | null;
  tokenExpiresAt: string | null;
  revokedAt: string | null;
}

/** Keys that must never appear on client-facing intake JSON payloads. */
export const CLIENT_INTAKE_FORBIDDEN_KEYS = [
  "reportDraft",
  "reportFinal",
  "reportGeneratedAt",
  "reportFinalizedAt",
  "clinicianNotes",
  "overrides",
  "clinicianId",
  "clientId",
  "notifiedAt",
  "reviewedAt",
  "diagnosticImpressions",
  "answers",
] as const;

export type ClientIntakeForbiddenKey = (typeof CLIENT_INTAKE_FORBIDDEN_KEYS)[number];

/**
 * Map a full episode/session record to the client-safe intake DTO.
 * Does not spread or redact — only copies the allowlisted fields.
 */
export function toClientIntakeDTO(record: EpisodeRecord): ClientIntakeDTO {
  return {
    token: record.token,
    clientName: record.clientName,
    status: record.status,
    consentAcceptedAt: record.consentAcceptedAt,
    tokenExpiresAt: record.tokenExpiresAt,
    revokedAt: record.revokedAt,
  };
}

/**
 * Walk a JSON-serializable value and return the first forbidden key path found, or null.
 * Used by security tests (and optional runtime asserts).
 */
export function findForbiddenClientIntakeKey(
  value: unknown,
  path = "$",
): string | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const hit = findForbiddenClientIntakeKey(value[i], `${path}[${i}]`);
      if (hit) return hit;
    }
    return null;
  }
  if (typeof value !== "object") return null;

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if ((CLIENT_INTAKE_FORBIDDEN_KEYS as readonly string[]).includes(key)) {
      return `${path}.${key}`;
    }
    const hit = findForbiddenClientIntakeKey(child, `${path}.${key}`);
    if (hit) return hit;
  }
  return null;
}
