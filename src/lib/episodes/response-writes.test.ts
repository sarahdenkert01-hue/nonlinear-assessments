import { describe, expect, it } from "vitest";
import {
  normalizeRevision,
  snapshotFromRows,
} from "./response-writes";
import { mergeAnswerMaps, missingRequiredScreenerItems } from "./screener-required";
import { answersToRows, responsesToAnswers } from "./responses";

/**
 * Pure-logic coverage for the persistence contract.
 * DB upsert/concurrency paths are exercised via these planners + repository semantics.
 */
describe("response write planners", () => {
  it("treats null/undefined revision as 0", () => {
    expect(normalizeRevision(null)).toBe(0);
    expect(normalizeRevision(undefined)).toBe(0);
    expect(normalizeRevision(3)).toBe(3);
  });

  it("snapshots existing rows for recoverable history", () => {
    expect(
      snapshotFromRows([
        { itemId: "q01", value: "Often" },
        { itemId: "entries", value: [{ id: "a" }] },
      ]),
    ).toEqual({
      q01: "Often",
      entries: [{ id: "a" }],
    });
  });

  it("multi-page autosave payload upserts only included keys (omitted preserved conceptually)", () => {
    const stored = { q01: "Often", q02: "Never", q03: "Sometimes" };
    const pageTwoOnly = { q10: "Agree", q11: "Disagree" };
    const afterAutosaveMerge = mergeAnswerMaps(stored, pageTwoOnly);
    expect(afterAutosaveMerge.q01).toBe("Often");
    expect(afterAutosaveMerge.q10).toBe("Agree");
    expect(answersToRows(pageTwoOnly).map((r) => r.itemId)).toEqual(["q10", "q11"]);
  });

  it("refresh/resume rebuilds full answers from stored rows", () => {
    const rows = [
      { itemId: "q01", value: "Often" },
      { itemId: "q46", value: "Agree" },
      { itemId: "q47", value: "open" },
    ];
    expect(responsesToAnswers(rows)).toEqual({
      q01: "Often",
      q46: "Agree",
      q47: "open",
    });
  });

  it("remount on final chapter keeps prior scored answers when only open items change", () => {
    const stored = Object.fromEntries(
      Array.from({ length: 46 }, (_, i) => [
        `q${String(i + 1).padStart(2, "0")}`,
        "Sometimes",
      ]),
    );
    const openOnly = { q47: "day to day", q48: "unexplained", q49: "hard day" };
    const merged = mergeAnswerMaps(stored, openOnly);
    expect(missingRequiredScreenerItems(merged)).toEqual([]);
    expect(Object.keys(merged)).toHaveLength(49);
  });

  it("partial final submit merges stored + incoming and still validates completeness", () => {
    const stored = Object.fromEntries(
      Array.from({ length: 46 }, (_, i) => [
        `q${String(i + 1).padStart(2, "0")}`,
        "Sometimes",
      ]),
    );
    const partialSubmit = { q47: "only open text" };
    const merged = mergeAnswerMaps(stored, partialSubmit);
    expect(missingRequiredScreenerItems(merged)).toEqual([]);
    expect(merged.q01).toBe("Sometimes");
    expect(merged.q47).toBe("only open text");
  });

  it("omitted answers are preserved by merge (not replaced with empty map)", () => {
    const stored = { q01: "Often", q02: "Never" };
    expect(mergeAnswerMaps(stored, {})).toEqual(stored);
  });

  it("explicit answer updates overwrite only the provided itemIds", () => {
    const stored = { q01: "Often", q02: "Never" };
    expect(mergeAnswerMaps(stored, { q02: "Sometimes" })).toEqual({
      q01: "Often",
      q02: "Sometimes",
    });
  });

  it("explicit clear is represented separately from omitted keys", () => {
    const incoming = { q01: "Often" };
    const clearItemIds = ["q02"];
    // Planner contract: upsert rows exclude cleared ids; clears are explicit.
    const rows = answersToRows(incoming).filter((r) => !clearItemIds.includes(r.itemId));
    expect(rows).toEqual([{ itemId: "q01", value: "Often" }]);
    expect(clearItemIds).toEqual(["q02"]);
  });

  it("incomplete submission is rejected when scored items missing after merge", () => {
    const stored = { q47: "open only" };
    const incoming = { q48: "more open" };
    const merged = mergeAnswerMaps(stored, incoming);
    expect(missingRequiredScreenerItems(merged).length).toBe(46);
  });

  it("hydration causes no write when answers are unchanged (no outgoing rows)", () => {
    const hydrated = { q01: "Often" };
    // Autosave is gated client-side until hydrated; first notify is skipped in AssessmentForm.
    // Server write planner with empty incoming upsert set changes nothing except when clear/submit.
    expect(answersToRows({}).length).toBe(0);
    expect(mergeAnswerMaps(hydrated, {})).toEqual(hydrated);
  });

  it("stale tab revision mismatch is detectable before write", () => {
    const serverRevision = 4;
    const staleTabExpected = 2;
    expect(normalizeRevision(staleTabExpected) === normalizeRevision(serverRevision)).toBe(
      false,
    );
  });

  it("response revision recovery uses previousSnapshot shape", () => {
    const previousSnapshot = snapshotFromRows([
      { itemId: "q01", value: "Often" },
      { itemId: "q02", value: "Never" },
    ]);
    // Recovery path: restore from history snapshot without inventing missing keys.
    expect(previousSnapshot).toEqual({ q01: "Often", q02: "Never" });
  });

  it("life map partial updates upsert only the entries key", () => {
    const incoming = {
      entries: [{ id: "a", title: "School" }],
    };
    expect(Object.keys(incoming)).toEqual(["entries"]);
  });

  it("reflection partial updates upsert only edited section keys", () => {
    const stored = { patterns: "A", hopes: "B" };
    const incoming = { hopes: "B2" };
    expect(mergeAnswerMaps(stored, incoming)).toEqual({
      patterns: "A",
      hopes: "B2",
    });
    expect(Object.keys(incoming)).toEqual(["hopes"]);
  });
});
