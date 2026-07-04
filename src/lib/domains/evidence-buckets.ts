import type { DomainEvidenceItem, DomainFindingRef, EvidenceSourceType } from "./types";

export type EvidenceBucketId =
  | "screener"
  | "structured-interview"
  | "observation"
  | "collateral"
  | "records-notes";

export interface EvidenceBucket {
  id: EvidenceBucketId;
  label: string;
  description: string;
  itemCount: number;
  sourceTypes: EvidenceSourceType[];
  findings: DomainFindingRef[];
  items: DomainEvidenceItem[];
}

const BUCKET_DEFS: {
  id: EvidenceBucketId;
  label: string;
  description: string;
  sourceTypes: EvidenceSourceType[];
}[] = [
  {
    id: "screener",
    label: "Screener",
    description: "Confirmed findings and client self-report from assessment modules.",
    sourceTypes: ["FINDING", "CLIENT_SELF_REPORT"],
  },
  {
    id: "structured-interview",
    label: "Structured interview",
    description: "Clinician interviews and structured measures (ADHD, autism, sensory, etc.).",
    sourceTypes: ["CLINICIAN_INTERVIEW", "STRUCTURED_MEASURE"],
  },
  {
    id: "observation",
    label: "Clinician observation",
    description: "Direct session observation and behavioral notes.",
    sourceTypes: ["CLINICIAN_OBSERVATION"],
  },
  {
    id: "collateral",
    label: "Collateral",
    description: "Partner, family, school, or other informant input.",
    sourceTypes: ["COLLATERAL"],
  },
  {
    id: "records-notes",
    label: "Records & notes",
    description: "Clinician notes, uploaded records, and timeline data.",
    sourceTypes: ["MANUAL_NOTE"],
  },
];

export function groupEvidenceByBucket(
  findings: DomainFindingRef[],
  evidence: DomainEvidenceItem[],
): EvidenceBucket[] {
  return BUCKET_DEFS.map((def) => {
    const items = evidence.filter(
      (e) =>
        def.sourceTypes.includes(e.sourceType) &&
        e.sourceType !== "FINDING" &&
        (e.excerpt?.trim() || e.itemId),
    );
    const bucketFindings = def.id === "screener" ? findings : [];
    const findingItemCount = bucketFindings.reduce((n, f) => n + f.evidenceCount, 0);

    return {
      id: def.id,
      label: def.label,
      description: def.description,
      itemCount: items.length + findingItemCount + (bucketFindings.length > 0 ? bucketFindings.length : 0),
      sourceTypes: def.sourceTypes,
      findings: bucketFindings,
      items,
    };
  }).filter((b) => b.itemCount > 0 || b.id === "screener");
}

export function getActiveEvidenceBuckets(buckets: EvidenceBucket[]): EvidenceBucket[] {
  return buckets.filter((b) => b.itemCount > 0);
}
