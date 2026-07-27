import { describe, expect, it } from "vitest";
import {
  mergeAnswerMaps,
  missingRequiredScreenerItems,
  requiredScreenerItemIds,
} from "./screener-required";

describe("screener required items", () => {
  it("requires scored frequency/agreement items and excludes open-text q47–q49", () => {
    const required = requiredScreenerItemIds();
    expect(required).toContain("q01");
    expect(required).toContain("q46");
    expect(required).not.toContain("q47");
    expect(required).not.toContain("q48");
    expect(required).not.toContain("q49");
    expect(required).toHaveLength(46);
  });

  it("merges incoming answers over stored answers without dropping omitted keys", () => {
    const merged = mergeAnswerMaps(
      { q01: "Often", q02: "Never", q47: "old" },
      { q02: "Sometimes", q47: "new" },
    );
    expect(merged).toEqual({
      q01: "Often",
      q02: "Sometimes",
      q47: "new",
    });
  });

  it("flags incomplete submissions when scored items are missing", () => {
    const missing = missingRequiredScreenerItems({
      q01: "Often",
      q47: "open text only",
    });
    expect(missing).toContain("q02");
    expect(missing).not.toContain("q01");
    expect(missing.length).toBe(45);
  });

  it("accepts a complete scored set even when open items are blank", () => {
    const answers: Record<string, string> = {};
    for (const id of requiredScreenerItemIds()) {
      answers[id] = "Sometimes";
    }
    expect(missingRequiredScreenerItems(answers)).toEqual([]);
  });
});
