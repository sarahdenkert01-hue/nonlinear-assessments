import { describe, expect, it } from "vitest";
import {
  applySaveConflict,
  applySaveFailure,
  applySaveSuccess,
  beginSave,
  canSubmit,
  createInitialQueueState,
  diffDirtyItemIds,
  formatUnsavedAnswersMessage,
  hasUnsavedWork,
  noteLocalAnswers,
  prepareRetry,
  unsavedItemIdsForDisplay,
} from "./answer-save-queue";

describe("diffDirtyItemIds", () => {
  it("detects added, changed, and removed keys", () => {
    expect(
      diffDirtyItemIds(
        { q01: "Often", q02: "Never", q03: "Sometimes" },
        { q01: "Often", q02: "Rarely", q04: "Agree" },
      ),
    ).toEqual(["q02", "q03", "q04"]);
  });
});

describe("answer save queue", () => {
  it("coalesces rapid answers into one in-flight PATCH then a follow-up", () => {
    let state = createInitialQueueState({}, 0);
    let local: Record<string, string> = { q01: "Often", q02: "Never", q03: "Sometimes" };
    state = noteLocalAnswers(state, local);

    const first = beginSave(state, local);
    expect(first.request).toEqual({
      data: { q01: "Often", q02: "Never", q03: "Sometimes" },
      expectedRevision: 0,
    });
    expect(first.state.inFlight?.itemIds).toEqual(["q01", "q02", "q03"]);
    state = first.state;

    // Second begin while in-flight must not start overlapping PATCH
    local = { ...local, q04: "Agree" };
    const blocked = beginSave(state, local);
    expect(blocked.request).toBeNull();
    expect(blocked.state.inFlight).not.toBeNull();
    state = blocked.state;

    // Success clears q01–q03; q04 still dirty → follow-up
    state = applySaveSuccess(state, local, 1);
    expect(state.lastSaved).toEqual({
      q01: "Often",
      q02: "Never",
      q03: "Sometimes",
    });
    expect(state.dirtyItemIds).toEqual(["q04"]);
    expect(state.inFlight).toBeNull();

    const followUp = beginSave(state, local);
    expect(followUp.request?.data).toEqual({ q04: "Agree" });
    expect(followUp.request?.expectedRevision).toBe(1);
  });

  it("keeps an item dirty when it changes again while a save is in flight", () => {
    let state = createInitialQueueState({}, 0);
    let local: Record<string, string> = { q01: "Often", q02: "Never" };
    state = noteLocalAnswers(state, local);

    const started = beginSave(state, local);
    state = started.state;
    expect(started.request?.data).toEqual({ q01: "Often", q02: "Never" });

    // q02 changed mid-flight
    local = { q01: "Often", q02: "Sometimes" };
    state = applySaveSuccess(state, local, 1);

    expect(state.lastSaved).toEqual({ q01: "Often" });
    expect(state.dirtyItemIds).toEqual(["q02"]);
    expect(canSubmit(state)).toBe(false);

    const retry = beginSave(state, local);
    expect(retry.request?.data).toEqual({ q02: "Sometimes" });
  });

  it("identifies failed itemIds that are still unsaved", () => {
    let state = createInitialQueueState({}, 0);
    const local = { q12: "Often", q13: "Never", q15: "Agree" };
    state = noteLocalAnswers(state, local);
    state = beginSave(state, local).state;

    state = applySaveFailure(state, local, "network down");
    expect(state.status).toBe("error");
    expect(state.failedItemIds).toEqual(["q12", "q13", "q15"]);
    expect(unsavedItemIdsForDisplay(state)).toEqual(["q12", "q13", "q15"]);
    expect(formatUnsavedAnswersMessage(state.failedItemIds)).toBe(
      "3 answers have not been saved: Questions 12, 13, and 15.",
    );
    expect(canSubmit(state)).toBe(false);
  });

  it("successful retry clears only itemIds whose local values still match the snapshot", () => {
    let state = createInitialQueueState({}, 0);
    let local: Record<string, string> = { q12: "Often", q13: "Never" };
    state = noteLocalAnswers(state, local);
    state = beginSave(state, local).state;
    state = applySaveFailure(state, local, "fail");

    state = prepareRetry(state, local);
    const started = beginSave(state, local);
    state = started.state;

    // Change q13 while retry is in flight
    local = { q12: "Often", q13: "Sometimes" };
    state = applySaveSuccess(state, local, 2);

    expect(state.lastSaved).toEqual({ q12: "Often" });
    expect(state.dirtyItemIds).toEqual(["q13"]);
    expect(state.failedItemIds).toEqual([]);
    expect(canSubmit(state)).toBe(false);
  });

  it("conflict rebase updates revision only and preserves lastSaved + local dirty set", () => {
    let state = createInitialQueueState({ q01: "Rarely" }, 3);
    const local = { q01: "Often", q02: "Never" };
    state = noteLocalAnswers(state, local);
    state = beginSave(state, local).state;

    // Server module may omit keys — must not become authoritative lastSaved
    state = applySaveConflict(state, 7, local);

    expect(state.revision).toBe(7);
    expect(state.lastSaved).toEqual({ q01: "Rarely" });
    expect(state.dirtyItemIds).toEqual(["q01", "q02"]);
    expect(state.inFlight).toBeNull();
    expect(state.status).toBe("idle");

    const retry = beginSave(state, local);
    expect(retry.request).toEqual({
      data: { q01: "Often", q02: "Never" },
      expectedRevision: 7,
    });
  });

  it("flush readiness: submit waits until dirty and in-flight are clear", () => {
    let state = createInitialQueueState({}, 0);
    const local = { q01: "Often" };
    state = noteLocalAnswers(state, local);
    expect(canSubmit(state)).toBe(false);
    expect(hasUnsavedWork(state)).toBe(true);

    state = beginSave(state, local).state;
    expect(canSubmit(state)).toBe(false);
    expect(hasUnsavedWork(state)).toBe(true);

    state = applySaveSuccess(state, local, 1);
    expect(state.dirtyItemIds).toEqual([]);
    expect(state.inFlight).toBeNull();
    expect(state.status).toBe("saved");
    expect(canSubmit(state)).toBe(true);
    expect(hasUnsavedWork(state)).toBe(false);
  });

  it("hasUnsavedWork is true while dirty answers exist (beforeunload guard)", () => {
    let state = createInitialQueueState({ q01: "Often" }, 1);
    expect(hasUnsavedWork(state)).toBe(false);

    state = noteLocalAnswers(state, { q01: "Never" });
    expect(hasUnsavedWork(state)).toBe(true);
    expect(canSubmit(state)).toBe(false);
  });

  it("formats singular and pair unsaved messages", () => {
    expect(formatUnsavedAnswersMessage(["q12"])).toBe(
      "1 answer has not been saved: Question 12.",
    );
    expect(formatUnsavedAnswersMessage(["q13", "q12"])).toBe(
      "2 answers have not been saved: Questions 12 and 13.",
    );
  });
});
