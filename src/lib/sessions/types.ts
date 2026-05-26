import type { AssessmentAnswers, ClinicianOverrides } from "@/features/assessments";

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

export interface AssessmentSessionRecord {
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
