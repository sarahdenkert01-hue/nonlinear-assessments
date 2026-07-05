import { describe, expect, it } from "vitest";
import { computeDomainProgress, getAdjacentReviewableDomains } from "./domain-nav";
import type { DomainSummary } from "./types";

function summary(id: string, active: boolean): DomainSummary {
  return {
    domainId: id,
    label: id,
    description: "",
    confirmedFindingCount: active ? 1 : 0,
    evidenceCount: active ? 1 : 0,
    sourceTypes: active ? ["FINDING"] : [],
    suggestedGaps: [],
    confidence: null,
    reviewedAt: null,
    hasConfirmedFindings: active,
    hasFormulationStarted: false,
  };
}

describe("getAdjacentReviewableDomains", () => {
  it("navigates only domains with confirmed findings", () => {
    const domains = [
      summary("executive-function", true),
      summary("attention-regulation", false),
      summary("masking-adaptation", true),
    ];
    const nav = getAdjacentReviewableDomains(domains, "executive-function");
    expect(nav.next?.domainId).toBe("masking-adaptation");
    expect(nav.total).toBe(2);
  });
});

describe("computeDomainProgress", () => {
  it("uses compact checklist labels", () => {
    const progress = computeDomainProgress({
      hasConfirmedFindings: true,
      evidenceSummaryDraft: "Draft",
      clinicalQuestionPrompts: [{ askedAt: null }],
      summaryDraft: null,
    });
    expect(progress.steps.map((s) => s.label)).toEqual([
      "Evidence reviewed",
      "Synthesis drafted",
      "Questions explored",
      "Report complete",
    ]);
    expect(progress.steps.filter((s) => s.done)).toHaveLength(3);
  });
});
