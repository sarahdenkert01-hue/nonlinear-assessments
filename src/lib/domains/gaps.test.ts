import { describe, expect, it } from "vitest";
import { computeSuggestedGaps, groupAssessmentOpportunities, computeAssessmentOpportunities } from "./gaps";

describe("computeSuggestedGaps", () => {
  it("suggests finding review opportunity when domain has no evidence", () => {
    const gaps = computeSuggestedGaps("executive-function", [], false);
    expect(gaps.some((g) => /finding review|confirm relevant/i.test(g))).toBe(true);
  });

  it("suggests developmental history opportunity when empty", () => {
    const gaps = computeSuggestedGaps("developmental-history", [], false);
    expect(gaps[0]).toMatch(/lifespan|childhood/i);
  });

  it("suggests interview opportunity when only findings present", () => {
    const gaps = computeSuggestedGaps("executive-function", ["FINDING"], true);
    expect(gaps.some((g) => /interview|structured clinician/i.test(g))).toBe(true);
  });

  it("suggests developmental opportunity when only screener evidence present", () => {
    const gaps = computeSuggestedGaps("executive-function", ["FINDING"], true);
    expect(gaps.some((g) => /early presentation|longitudinal/i.test(g))).toBe(true);
  });

  it("suggests clarification when finding strength varies", () => {
    const gaps = computeSuggestedGaps(
      "executive-function",
      ["FINDING"],
      true,
      [
        { hits: 4, total: 4, category: null },
        { hits: 1, total: 4, category: null },
      ],
    );
    expect(gaps.some((g) => /vary in strength|clarif/i.test(g))).toBe(true);
  });

  it("does not imply diagnosis", () => {
    const gaps = computeSuggestedGaps("attention-regulation", ["FINDING"], true);
    for (const g of gaps) {
      expect(g.toLowerCase()).not.toMatch(/diagnos|confirm adhd|confirm autism/);
    }
  });
});

describe("groupAssessmentOpportunities", () => {
  it("groups opportunities by category", () => {
    const grouped = groupAssessmentOpportunities(
      computeAssessmentOpportunities("executive-function", ["FINDING"], true),
    );
    expect(grouped.length).toBeGreaterThan(0);
    expect(grouped.every((g) => g.items.length > 0)).toBe(true);
  });
});
