import { describe, expect, it } from "vitest";
import { computeEvidenceCoverage, computeSuggestedGaps } from "./gaps";

describe("computeSuggestedGaps", () => {
  it("suggests finding review opportunity when domain has no evidence", () => {
    const gaps = computeSuggestedGaps("executive-function", [], false);
    expect(gaps.some((g) => /finding review|opportunity/i.test(g))).toBe(true);
  });

  it("suggests developmental history opportunity when empty", () => {
    const gaps = computeSuggestedGaps("developmental-history", [], false);
    expect(gaps[0]).toMatch(/developmental history opportunity/i);
  });

  it("suggests interview opportunity when only findings present", () => {
    const gaps = computeSuggestedGaps("executive-function", ["FINDING"], true);
    expect(gaps.some((g) => /interview opportunity/i.test(g))).toBe(true);
  });

  it("suggests developmental opportunity when only screener evidence present", () => {
    const gaps = computeSuggestedGaps("executive-function", ["FINDING"], true);
    expect(gaps.some((g) => /developmental history opportunity/i.test(g))).toBe(true);
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
    expect(gaps.some((g) => /clarification opportunity/i.test(g))).toBe(true);
  });

  it("does not imply diagnosis", () => {
    const gaps = computeSuggestedGaps("attention-regulation", ["FINDING"], true);
    for (const g of gaps) {
      expect(g.toLowerCase()).not.toMatch(/diagnos|confirm adhd|confirm autism/);
    }
  });
});

describe("computeEvidenceCoverage", () => {
  it("computes percent from expected source types", () => {
    const coverage = computeEvidenceCoverage("executive-function", ["FINDING"]);
    expect(coverage.expected).toBeGreaterThan(0);
    expect(coverage.present).toBe(1);
    expect(coverage.percent).toBeGreaterThan(0);
  });
});
