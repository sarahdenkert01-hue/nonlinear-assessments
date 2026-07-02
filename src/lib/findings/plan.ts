import type { ClinicianOverrides, ThemeScore } from "@/features/assessments/types";
import type { FindingSource, FindingStatus } from "./types";

// A finding to be created from algorithm scores + any prior clinician overrides. This is the
// pure decision layer (no database), kept separate so it can be unit-tested for parity with the
// old theme-inclusion logic.
export interface FindingDraft {
  code: string;
  label: string;
  category: string;
  status: FindingStatus;
  source: FindingSource;
  hits: number;
  total: number;
}

// Translate theme scores (+ legacy include/exclude overrides) into finding drafts.
// - flagged theme, no override        -> PROPOSED / ALGORITHM (included by default)
// - clinician "include"               -> ACCEPTED (source ALGORITHM if it was flagged, else CLINICIAN)
// - clinician "exclude" of a flagged  -> EXCLUDED (kept for the record, left out of the report)
// - unflagged theme, no include       -> no finding at all
export function planFindings(
  scores: ThemeScore[],
  overrides: ClinicianOverrides = {},
): FindingDraft[] {
  const drafts: FindingDraft[] = [];

  for (const score of scores) {
    const override = overrides[score.id] ?? null;

    let status: FindingStatus;
    let source: FindingSource;

    if (override === "exclude") {
      if (!score.flagged) continue;
      status = "EXCLUDED";
      source = "ALGORITHM";
    } else if (override === "include") {
      status = "ACCEPTED";
      source = score.flagged ? "ALGORITHM" : "CLINICIAN";
    } else {
      if (!score.flagged) continue;
      status = "PROPOSED";
      source = "ALGORITHM";
    }

    drafts.push({
      code: score.id,
      label: score.label,
      category: score.category,
      status,
      source,
      hits: score.hits,
      total: score.total,
    });
  }

  return drafts;
}

// Findings that count toward the report (everything except EXCLUDED).
export function isIncludedStatus(status: FindingStatus): boolean {
  return status !== "EXCLUDED";
}
