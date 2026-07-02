import { describe, expect, it } from "vitest";
import { answersToRows, responsesToAnswers } from "./responses";

describe("responses bridge", () => {
  it("rebuilds an answers map from response rows", () => {
    const rows = [
      { itemId: "q01", value: "Often" },
      { itemId: "q02", value: "Very Often" },
    ];
    expect(responsesToAnswers(rows)).toEqual({ q01: "Often", q02: "Very Often" });
  });

  it("coerces non-string stored values to strings", () => {
    const rows = [{ itemId: "q01", value: 3 as unknown as string }];
    expect(responsesToAnswers(rows)).toEqual({ q01: "3" });
  });

  it("returns an empty map for no rows", () => {
    expect(responsesToAnswers([])).toEqual({});
  });

  it("splits an answers map into itemId/value rows", () => {
    expect(answersToRows({ q01: "Often", q10: "Never" })).toEqual([
      { itemId: "q01", value: "Often" },
      { itemId: "q10", value: "Never" },
    ]);
  });

  it("round-trips answers -> rows -> answers", () => {
    const answers = { q01: "Often", q02: "Sometimes", q03: "Never" };
    const rebuilt = responsesToAnswers(answersToRows(answers));
    expect(rebuilt).toEqual(answers);
  });
});
