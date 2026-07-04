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
    expect(gaps).toContain("No clinician interview evidence linked yet");
  });

  it("does not imply diagnosis", () => {
    const gaps = computeSuggestedGaps("attention-regulation", ["FINDING"], true);
    for (const g of gaps) {
      expect(g.toLowerCase()).not.toMatch(/diagnos|confirm adhd|confirm autism/);
    }
  });
});
