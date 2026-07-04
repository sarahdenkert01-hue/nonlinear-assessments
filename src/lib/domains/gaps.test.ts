import { describe, expect, it } from "vitest";
import { computeSuggestedGaps } from "./gaps";

describe("computeSuggestedGaps", () => {
  it("suggests no findings when domain has no evidence", () => {
    const gaps = computeSuggestedGaps("executive-function", [], false);
    expect(gaps).toContain("No confirmed findings linked to this domain yet");
  });

  it("suggests developmental history gap when empty", () => {
    const gaps = computeSuggestedGaps("developmental-history", [], false);
    expect(gaps[0]).toMatch(/developmental history/i);
  });

  it("suggests missing interview when only findings present", () => {
    const gaps = computeSuggestedGaps("executive-function", ["FINDING"], true);
    expect(gaps.some((g) => /interview/i.test(g))).toBe(true);
  });

  it("suggests developmental history when only screener evidence present", () => {
    const gaps = computeSuggestedGaps("executive-function", ["FINDING"], true);
    expect(gaps.some((g) => /developmental|childhood/i.test(g))).toBe(true);
  });

  it("suggests inconsistency when finding strength varies", () => {
    const gaps = computeSuggestedGaps(
      "executive-function",
      ["FINDING"],
      true,
      [
        { hits: 4, total: 4, category: null },
        { hits: 1, total: 4, category: null },
      ],
    );
    expect(gaps.some((g) => /vary|inconsistent|strength/i.test(g))).toBe(true);
  });

  it("does not imply diagnosis", () => {
    const gaps = computeSuggestedGaps("attention-regulation", ["FINDING"], true);
    for (const g of gaps) {
      expect(g.toLowerCase()).not.toMatch(/diagnos|confirm adhd|confirm autism/);
    }
  });
});
