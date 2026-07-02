export type FindingStatus = "PROPOSED" | "ACCEPTED" | "EDITED" | "EXCLUDED";
export type FindingSource = "ALGORITHM" | "CLINICIAN";
export type Confidence = "LOW" | "MODERATE" | "HIGH";

// One endorsed item behind a finding, resolved to readable text + the client's answer.
export interface FindingEvidenceItem {
  id: string;
  itemId: string;
  text: string;
  answer: string;
}

export interface FindingRecord {
  id: string;
  episodeId: string;
  code: string;
  label: string;
  category: string | null;
  status: FindingStatus;
  source: FindingSource;
  confidence: Confidence | null;
  alternativeExplanations: string[];
  rationale: string | null;
  hits: number;
  total: number;
  evidence: FindingEvidenceItem[];
  createdAt: string;
  updatedAt: string;
}

// Fields a clinician may change on a finding. Confidence stays clinician-owned; passing null
// clears it back to "unset".
export interface UpdateFindingInput {
  status?: FindingStatus;
  confidence?: Confidence | null;
  alternativeExplanations?: string[];
  rationale?: string | null;
}

export interface AddFindingInput {
  code: string;
  label: string;
  category?: string;
}
