import { describe, expect, it } from "vitest";
import type { FindingRecord } from "@/lib/findings/types";
import {
  computeFindingsToolbarCounts,
  orderFindingsForReview,
  selectVisibleFindings,
} from "./findings-review-model";

function makeFinding(
  overrides: Partial<FindingRecord> & Pick<FindingRecord, "id" | "code" | "label">,
): FindingRecord {
  return {
    episodeId: "ep_test",
    category: "Both",
    status: "PROPOSED",
    source: "ALGORITHM",
    confidence: null,
    alternativeExplanations: [],
    rationale: null,
    hits: 2,
    total: 3,
    evidence: [],
    createdAt: "2026-09-12T00:00:00.000Z",
    updatedAt: "2026-09-12T00:00:00.000Z",
    ...overrides,
  };
}

function makeTwentySevenFindings(): FindingRecord[] {
  return Array.from({ length: 27 }, (_, i) => {
    const n = i + 1;
    return makeFinding({
      id: `finding_${String(n).padStart(2, "0")}`,
      code: `theme-${String(n).padStart(2, "0")}`,
      label: `Theme ${String(n).padStart(2, "0")}`,
      hits: 30 - n,
      total: 30,
      status: n <= 20 ? "PROPOSED" : n <= 24 ? "ACCEPTED" : "EXCLUDED",
    });
  });
}

describe("FindingsReview model (27-finding regression)", () => {
  it("toolbar totals use the full findings array (27), not a sliced subset", () => {
    const findings = makeTwentySevenFindings();
    const counts = computeFindingsToolbarCounts(findings);
    expect(counts.totalCount).toBe(27);
    expect(counts.needsReviewCount).toBe(20);
    expect(counts.excludedCount).toBe(3);
    expect(counts.includedCount).toBe(24);
    expect(counts.reviewedCount).toBe(7);
  });

  it("with filterMode=all, visible collection includes all 27 findings", () => {
    const findings = orderFindingsForReview(makeTwentySevenFindings());
    const visible = selectVisibleFindings(findings, "all");
    expect(visible).toHaveLength(27);
    expect(new Set(visible.map((f) => f.id)).size).toBe(27);
  });

  it("awaiting-decision filter narrows cards but toolbar still counts all findings", () => {
    const findings = orderFindingsForReview(makeTwentySevenFindings());
    const visible = selectVisibleFindings(findings, "undecided");
    const counts = computeFindingsToolbarCounts(findings);

    expect(visible).toHaveLength(20);
    expect(visible.every((f) => f.status === "PROPOSED")).toBe(true);
    expect(counts.totalCount).toBe(27);
    expect(counts.needsReviewCount).toBe(20);
    expect(counts.includedCount).toBe(24);
  });

  it("does not drop findings when re-ordering for review", () => {
    const findings = makeTwentySevenFindings();
    const ordered = orderFindingsForReview(findings);
    expect(ordered).toHaveLength(27);
    expect(ordered.map((f) => f.id).sort()).toEqual(findings.map((f) => f.id).sort());
  });
});
