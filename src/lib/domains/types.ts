import type { Confidence, FindingEvidenceItem } from "@/lib/findings/types";

export type EvidenceSourceType =
  | "CLIENT_SELF_REPORT"
  | "CLINICIAN_INTERVIEW"
  | "CLINICIAN_OBSERVATION"
  | "COLLATERAL"
  | "STRUCTURED_MEASURE"
  | "MANUAL_NOTE"
  | "FINDING";

export interface DomainFindingRef {
  id: string;
  code: string;
  label: string;
  category: string | null;
  status: string;
  hits: number;
  total: number;
  evidenceCount: number;
  evidence: FindingEvidenceItem[];
}

export interface DomainEvidenceItem {
  id: string;
  sourceType: EvidenceSourceType;
  findingId: string | null;
  findingLabel: string | null;
  responseId: string | null;
  itemId: string | null;
  excerpt: string | null;
}

export interface DomainSummary {
  domainId: string;
  label: string;
  description: string;
  confirmedFindingCount: number;
  evidenceCount: number;
  sourceTypes: EvidenceSourceType[];
  suggestedGaps: string[];
  confidence: Confidence | null;
  reviewedAt: string | null;
  hasConfirmedFindings: boolean;
}

export interface DomainDetail extends DomainSummary {
  alternativeExplanations: string[];
  clinicalNotes: string | null;
  evidenceGapNotes: string | null;
  evidenceSummaryDraft: string | null;
  suggestedQuestionsDraft: string | null;
  summaryDraft: string | null;
  findings: DomainFindingRef[];
  evidence: DomainEvidenceItem[];
}

export interface UpdateDomainReviewInput {
  confidence?: Confidence | null;
  alternativeExplanations?: string[];
  clinicalNotes?: string | null;
  evidenceGapNotes?: string | null;
  evidenceSummaryDraft?: string | null;
  suggestedQuestionsDraft?: string | null;
  summaryDraft?: string | null;
  reviewed?: boolean;
}

export interface AddManualEvidenceInput {
  excerpt: string;
}
