import { describe, expect, it, vi } from "vitest";
import {
  applySaveFailure,
  applySaveSuccess,
  beginSave,
  canSubmit,
  createInitialQueueState,
  diffDirtyItemIds,
  formatLeaveUnsavedMessage,
  hasUnsavedWork,
  noteLocalAnswers,
  resolveLeaveAfterFlush,
} from "@/features/journey/answer-save-queue";
import {
  canAutoAdvanceAfterAnswer,
  commitAnswerToMap,
  nextQuestionIndexAfterAdvance,
  resolvePreviousWhileArmed,
  resolveSelectThenContinue,
  shouldIgnoreContinueWhileAutoAdvanceArmed,
  shouldShowContinueCta,
} from "./single-question-nav";

describe("single-question navigation guards", () => {
  it("hides Continue when auto-advance is available mid-section", () => {
    const ctx = {
      singleQuestionMode: true,
      format: "frequency" as const,
      questionIndex: 2,
      questionsInSection: 6,
    };
    expect(canAutoAdvanceAfterAnswer(ctx)).toBe(true);
    expect(shouldShowContinueCta(ctx)).toBe(false);
  });

  it("shows Continue on section-boundary questions", () => {
    const ctx = {
      singleQuestionMode: true,
      format: "frequency" as const,
      questionIndex: 5,
      questionsInSection: 6,
    };
    expect(canAutoAdvanceAfterAnswer(ctx)).toBe(false);
    expect(shouldShowContinueCta(ctx)).toBe(true);
  });

  it("select + immediate Continue does not double-advance while armed", () => {
    const result = resolveSelectThenContinue({
      armed: true,
      questionIndex: 3,
      questionsInSection: 8,
      continueClicked: true,
      timerFired: true,
    });
    expect(result.continueIgnored).toBe(true);
    // Timer still fires once → single advance
    expect(result.questionIndex).toBe(4);
    expect(result.advancedByTimer).toBe(true);
  });

  it("auto-advance timer after manual Continue is cancelled when Continue is allowed to cancel arming", () => {
    // Manual Continue when not armed advances once; cancelled timer must not advance again.
    const questionIndex = 1;
    let armed = false;
    // Select arms
    armed = true;
    // Continue while armed → ignored
    expect(shouldIgnoreContinueWhileAutoAdvanceArmed(armed)).toBe(true);
    // Timer cancelled by Previous/Continue cancel path:
    armed = false;
    const afterCancel = resolveSelectThenContinue({
      armed,
      questionIndex,
      questionsInSection: 8,
      continueClicked: false,
      timerFired: true,
    });
    expect(afterCancel.advancedByTimer).toBe(false);
    expect(afterCancel.questionIndex).toBe(1);
  });

  it("Previous before auto-advance fires cancels forward skip", () => {
    const result = resolvePreviousWhileArmed({
      questionIndex: 4,
      cancelArmed: true,
    });
    expect(result.armed).toBe(false);
    expect(result.questionIndex).toBe(3);
  });

  it("commitAnswerToMap produces the exact next map used for queue notify", () => {
    const prev = { q01: "Often" };
    const next = commitAnswerToMap(prev, "q02", "Never");
    expect(next).toEqual({ q01: "Often", q02: "Never" });
    expect(prev).toEqual({ q01: "Often" });
    expect(diffDirtyItemIds(next, {})).toEqual(["q01", "q02"]);
  });

  it("nextQuestionIndexAfterAdvance never skips", () => {
    expect(nextQuestionIndexAfterAdvance(0, 5)).toBe(1);
    expect(nextQuestionIndexAfterAdvance(4, 5)).toBe(4);
  });
});

describe("leave / flush navigation", () => {
  it("leaving during debounce window: promote + flush can clear dirty", () => {
    let state = createInitialQueueState({}, 0);
    const local = { q01: "Often", q02: "Never" };
    state = noteLocalAnswers(state, local);
    expect(hasUnsavedWork(state)).toBe(true);

    // Simulate flush: begin save immediately (debounce promoted)
    const started = beginSave(state, local);
    expect(started.request?.data).toEqual(local);
    state = applySaveSuccess(started.state, local, 1);
    expect(canSubmit(state)).toBe(true);
    expect(resolveLeaveAfterFlush({ flushOk: true, dirtyItemIds: [] }).allowNavigation).toBe(
      true,
    );
  });

  it("leaving while PATCH in flight keeps unsaved work until success", () => {
    let state = createInitialQueueState({}, 0);
    const local = { q05: "Agree" };
    state = noteLocalAnswers(state, local);
    state = beginSave(state, local).state;
    expect(state.inFlight).not.toBeNull();
    expect(hasUnsavedWork(state)).toBe(true);
    expect(canSubmit(state)).toBe(false);

    state = applySaveSuccess(state, local, 2);
    expect(hasUnsavedWork(state)).toBe(false);
  });

  it("failed flush blocks navigation and identifies exact questions", () => {
    let state = createInitialQueueState({}, 0);
    const local = { q12: "Often", q13: "Never", q15: "Agree" };
    state = noteLocalAnswers(state, local);
    state = beginSave(state, local).state;
    state = applySaveFailure(state, local, "network");
    const decision = resolveLeaveAfterFlush({
      flushOk: false,
      dirtyItemIds: state.failedItemIds,
    });
    expect(decision.allowNavigation).toBe(false);
    expect(decision.message).toBe(
      "Questions 12, 13, and 15 have not been saved.",
    );
    expect(formatLeaveUnsavedMessage(state.failedItemIds)).toBe(
      "Questions 12, 13, and 15 have not been saved.",
    );
  });

  it("successful flush permits navigation", () => {
    expect(
      resolveLeaveAfterFlush({ flushOk: true, dirtyItemIds: [] }),
    ).toEqual({ allowNavigation: true, message: null });
  });

  it("final answer selected immediately before refresh stays dirty until save settles", () => {
    let state = createInitialQueueState({ q48: "Often" }, 10);
    const local = { q48: "Often", q49: "Sometimes" };
    state = noteLocalAnswers(state, local);
    expect(state.dirtyItemIds).toEqual(["q49"]);
    expect(hasUnsavedWork(state)).toBe(true);
    // beforeunload should warn
    expect(hasUnsavedWork(state)).toBe(true);
    const started = beginSave(state, local);
    state = applySaveSuccess(started.state, local, 11);
    expect(hasUnsavedWork(state)).toBe(false);
  });

  it("rapid completion then immediate exit requires flush of all dirty ids", () => {
    let state = createInitialQueueState({}, 0);
    let local: Record<string, string> = {};
    // Rapid answers across many questions without waiting for debounce
    for (let i = 1; i <= 12; i++) {
      const id = `q${String(i).padStart(2, "0")}`;
      local = commitAnswerToMap(local, id, "Often");
      state = noteLocalAnswers(state, local);
    }
    expect(state.dirtyItemIds).toHaveLength(12);

    // Immediate exit → flush (no debounce wait)
    const first = beginSave(state, local);
    expect(Object.keys(first.request!.data)).toHaveLength(12);
    state = applySaveSuccess(first.state, local, 1);
    expect(canSubmit(state)).toBe(true);

    // Reopen hydration seed = lastSaved
    const reopened = createInitialQueueState(state.lastSaved, state.revision);
    expect(Object.keys(reopened.lastSaved)).toHaveLength(12);
    expect(diffDirtyItemIds(local, reopened.lastSaved)).toEqual([]);
  });

  it("sync notify marks the selected question dirty before navigation", () => {
    const lastSaved = { q01: "Often" };
    let state = createInitialQueueState(lastSaved, 1);
    const next = commitAnswerToMap(lastSaved, "q02", "Never");
    // Notify queue with exact next map (no waiting for React effect)
    state = noteLocalAnswers(state, next);
    expect(state.dirtyItemIds).toContain("q02");
    // Navigation may proceed only after dirty is recorded
    expect(hasUnsavedWork(state)).toBe(true);
  });
});

describe("debounce promote semantics", () => {
  it("does not drop dirty answers when a pending debounce is cancelled in favor of flush", () => {
    const clearTimeoutSpy = vi.fn();
    // Simulate: debounce pending, then promote clears timer and beginSave uses latest local
    let state = createInitialQueueState({}, 0);
    const local = { q20: "Agree", q21: "Disagree" };
    state = noteLocalAnswers(state, local);
    // "cancel debounce"
    clearTimeoutSpy();
    const { request } = beginSave(state, local);
    expect(request?.data).toEqual(local);
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
