import type { AssessmentAnswers, ClinicianOverrides } from "@/features/assessments";
import type { ClientModuleRecord } from "@/lib/modules/types";

export type SessionStatus = "DRAFT" | "SUBMITTED" | "REVIEWED";

export type DashboardFilter =
  | "all"
  | "awaiting_client"
  | "ready_to_review"
  | "in_progress"
  | "reviewed";

export interface ClientRecord {
  id: string;
  clinicianId: string;
  displayName: string;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

// A single, flat view of an episode + its screener module + screener answers.
// The field shape is intentionally unchanged from the previous AssessmentSession record so the
// rest of the app keeps working while the underlying tables change. `AssessmentSessionRecord`
// remains exported as an alias for the files that still use that name.
// Prefer ClientAssessmentEpisode / ClientModuleRecord for multi-module journey flows.
export interface EpisodeRecord {
  id: string;
  token: string;
  clinicianId: string | null;
  clientId: string | null;
  status: SessionStatus;
  clientName: string | null;
  answers: AssessmentAnswers;
  overrides: ClinicianOverrides | null;
  clinicianNotes: string | null;
  reportDraft: string | null;
  reportFinal: string | null;
  reportGeneratedAt: string | null;
  reportFinalizedAt: string | null;
  consentAcceptedAt: string | null;
  tokenExpiresAt: string | null;
  revokedAt: string | null;
  notifiedAt: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AssessmentSessionRecord = EpisodeRecord;

// Lightweight per-module row for the episode overview page.
export interface ModuleSummary {
  id: string;
  moduleKey: string;
  moduleVersion: string;
  audience: "CLIENT" | "CLINICIAN";
  status: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "COMPLETED";
  answeredCount: number;
  submittedAt: string | null;
  title: string;
}

export type { ClientModuleRecord };

export interface CreateSessionInput {
  clientName?: string;
  clinicianId: string;
  clientId?: string;
  tokenExpiresInDays?: number;
}

export interface ListSessionsQuery {
  filter?: DashboardFilter;
  search?: string;
}

export interface UpdateSessionReviewInput {
  overrides?: ClinicianOverrides;
  clinicianNotes?: string;
  reportDraft?: string;
  status?: "REVIEWED";
  reportFinal?: string;
  reportFinalized?: boolean;
}

export interface CreateClientInput {
  clinicianId: string;
  displayName: string;
  email?: string;
}
