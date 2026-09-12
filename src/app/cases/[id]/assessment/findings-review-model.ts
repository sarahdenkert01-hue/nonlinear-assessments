import type { FindingRecord, FindingStatus } from "@/lib/findings/types";

export type FindingsFilterMode = "all" | "undecided";

export function isProposedFinding(f: FindingRecord): boolean {
  return f.status === "PROPOSED";
}

export function isIncludedFindingStatus(status: FindingStatus): boolean {
  return status !== "EXCLUDED";
}

export function orderFindingsForReview(list: FindingRecord[]): FindingRecord[] {
  const rank = (f: FindingRecord) =>
    f.status === "PROPOSED" ? 0 : f.status === "EXCLUDED" ? 2 : 1;
  const strengthRatio = (f: FindingRecord) =>
    f.total > 0 ? f.hits / f.total : f.hits > 0 ? 1 : 0;
  return [...list].sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    if (strengthRatio(a) !== strengthRatio(b)) return strengthRatio(b) - strengthRatio(a);
    return a.label.localeCompare(b.label);
  });
}

export function selectVisibleFindings(
  findings: FindingRecord[],
  filterMode: FindingsFilterMode,
): FindingRecord[] {
  if (filterMode === "undecided") return findings.filter(isProposedFinding);
  return findings;
}

export function computeFindingsToolbarCounts(findings: FindingRecord[]): {
  totalCount: number;
  needsReviewCount: number;
  includedCount: number;
  excludedCount: number;
  reviewedCount: number;
} {
  const totalCount = findings.length;
  const needsReviewCount = findings.filter(isProposedFinding).length;
  const includedCount = findings.filter((f) => isIncludedFindingStatus(f.status)).length;
  const excludedCount = findings.filter((f) => f.status === "EXCLUDED").length;
  return {
    totalCount,
    needsReviewCount,
    includedCount,
    excludedCount,
    reviewedCount: totalCount - needsReviewCount,
  };
}
