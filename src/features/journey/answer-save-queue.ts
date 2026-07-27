import { QUESTIONS, buildSections } from "@/features/assessments";
import { isAssessmentQuestion } from "@/features/assessments/types";

export type AnswerMap = Record<string, string>;

export type SaveQueueStatus = "idle" | "saving" | "saved" | "error";

export type InFlightSave = {
  /** Exact itemIds included in this PATCH body */
  itemIds: readonly string[];
  /** Values sent for those itemIds (frozen at request start) */
  snapshot: AnswerMap;
  expectedRevision: number | null;
};

export type AnswerSaveQueueState = {
  /** Last values confirmed on the server */
  lastSaved: AnswerMap;
  /** Keys where local !== lastSaved */
  dirtyItemIds: string[];
  /** At most one in-flight PATCH */
  inFlight: InFlightSave | null;
  status: SaveQueueStatus;
  lastError: string | null;
  /** ItemIds from the failed batch that are still dirty */
  failedItemIds: string[];
  revision: number | null;
};

export type SaveRequest = {
  data: AnswerMap;
  expectedRevision: number | null;
};

function sortedUnique(ids: Iterable<string>): string[] {
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/** Keys where local value differs from last confirmed server value. */
export function diffDirtyItemIds(local: AnswerMap, lastSaved: AnswerMap): string[] {
  const keys = new Set([...Object.keys(local), ...Object.keys(lastSaved)]);
  const dirty: string[] = [];
  for (const key of keys) {
    const left = local[key];
    const right = lastSaved[key];
    if (left !== right) dirty.push(key);
  }
  return sortedUnique(dirty);
}

export function createInitialQueueState(
  lastSaved: AnswerMap = {},
  revision: number | null = null,
): AnswerSaveQueueState {
  return {
    lastSaved: { ...lastSaved },
    dirtyItemIds: [],
    inFlight: null,
    status: "idle",
    lastError: null,
    failedItemIds: [],
    revision,
  };
}

/** Sync dirty set from the latest local map (does not start a save). */
export function noteLocalAnswers(
  state: AnswerSaveQueueState,
  local: AnswerMap,
): AnswerSaveQueueState {
  const dirtyItemIds = diffDirtyItemIds(local, state.lastSaved);
  return {
    ...state,
    dirtyItemIds,
    status:
      state.inFlight || state.status === "saving"
        ? "saving"
        : dirtyItemIds.length > 0
          ? state.status === "error"
            ? "error"
            : "idle"
          : state.status === "error"
            ? "error"
            : state.status === "saved"
              ? "saved"
              : "idle",
  };
}

/**
 * Begin a save if idle and dirty. Returns null request when nothing to send
 * (in-flight already, or no dirty keys).
 */
export function beginSave(
  state: AnswerSaveQueueState,
  local: AnswerMap,
): { state: AnswerSaveQueueState; request: SaveRequest | null } {
  if (state.inFlight) {
    return { state: noteLocalAnswers(state, local), request: null };
  }

  const dirtyItemIds = diffDirtyItemIds(local, state.lastSaved);
  if (dirtyItemIds.length === 0) {
    return {
      state: {
        ...state,
        dirtyItemIds: [],
        status: state.status === "error" ? "error" : "saved",
      },
      request: null,
    };
  }

  const snapshot: AnswerMap = {};
  for (const id of dirtyItemIds) {
    if (Object.prototype.hasOwnProperty.call(local, id)) {
      snapshot[id] = local[id]!;
    }
  }

  const inFlight: InFlightSave = {
    itemIds: dirtyItemIds,
    snapshot,
    expectedRevision: state.revision,
  };

  return {
    state: {
      ...state,
      dirtyItemIds,
      inFlight,
      status: "saving",
      lastError: state.status === "error" ? state.lastError : null,
    },
    request: {
      data: snapshot,
      expectedRevision: state.revision,
    },
  };
}

/**
 * On success: clear lastSaved only for itemIds whose local value still matches
 * the snapshot that was saved. Mid-flight edits stay dirty.
 */
export function applySaveSuccess(
  state: AnswerSaveQueueState,
  localNow: AnswerMap,
  nextRevision: number | null,
): AnswerSaveQueueState {
  if (!state.inFlight) {
    return {
      ...noteLocalAnswers(state, localNow),
      revision: nextRevision ?? state.revision,
    };
  }

  const lastSaved = { ...state.lastSaved };
  for (const id of state.inFlight.itemIds) {
    if (localNow[id] === state.inFlight.snapshot[id]) {
      if (Object.prototype.hasOwnProperty.call(state.inFlight.snapshot, id)) {
        lastSaved[id] = state.inFlight.snapshot[id]!;
      } else {
        delete lastSaved[id];
      }
    }
  }

  const dirtyItemIds = diffDirtyItemIds(localNow, lastSaved);

  return {
    lastSaved,
    dirtyItemIds,
    inFlight: null,
    status: dirtyItemIds.length > 0 ? "idle" : "saved",
    lastError: null,
    // Exit error mode on any successful save; remaining dirty ids retry via follow-up.
    failedItemIds: [],
    revision: nextRevision ?? state.revision,
  };
}

/**
 * Conflict (409): update revision only. Preserve local answers and lastSaved.
 * Clear in-flight so the pump can retry the current dirty snapshot.
 */
export function applySaveConflict(
  state: AnswerSaveQueueState,
  nextRevision: number | null,
  localNow: AnswerMap,
): AnswerSaveQueueState {
  const dirtyItemIds = diffDirtyItemIds(localNow, state.lastSaved);
  return {
    ...state,
    dirtyItemIds,
    inFlight: null,
    status: dirtyItemIds.length > 0 ? "idle" : "saved",
    lastError: null,
    failedItemIds: [],
    revision: nextRevision ?? state.revision,
  };
}

/** Keep failed batch itemIds that are still dirty; leave lastSaved unchanged. */
export function applySaveFailure(
  state: AnswerSaveQueueState,
  localNow: AnswerMap,
  error: string,
): AnswerSaveQueueState {
  const dirtyItemIds = diffDirtyItemIds(localNow, state.lastSaved);
  const dirtySet = new Set(dirtyItemIds);
  const failedItemIds = sortedUnique(
    (state.inFlight?.itemIds ?? state.failedItemIds).filter((id) => dirtySet.has(id)),
  );

  return {
    ...state,
    dirtyItemIds,
    inFlight: null,
    status: "error",
    lastError: error,
    failedItemIds,
  };
}

/** Clear error status so retry can kick the pump again. */
export function prepareRetry(
  state: AnswerSaveQueueState,
  localNow: AnswerMap,
): AnswerSaveQueueState {
  const dirtyItemIds = diffDirtyItemIds(localNow, state.lastSaved);
  return {
    ...state,
    dirtyItemIds,
    inFlight: null,
    status: dirtyItemIds.length > 0 ? "idle" : "saved",
    lastError: null,
    // Keep failedItemIds until a successful clear for messaging until retry starts
    failedItemIds: state.failedItemIds,
  };
}

export function canSubmit(state: AnswerSaveQueueState): boolean {
  return (
    state.dirtyItemIds.length === 0 &&
    state.inFlight === null &&
    state.status !== "error"
  );
}

export function hasUnsavedWork(state: AnswerSaveQueueState): boolean {
  return state.dirtyItemIds.length > 0 || state.inFlight !== null;
}

/** ItemIds to surface in the unsaved/error UI. */
export function unsavedItemIdsForDisplay(state: AnswerSaveQueueState): string[] {
  if (state.status === "error" && state.failedItemIds.length > 0) {
    return state.failedItemIds;
  }
  return state.dirtyItemIds;
}

const ASSESSMENT_QUESTIONS = QUESTIONS.filter(isAssessmentQuestion);

/** Global 1-based screener question number (q01 → 1). */
export function globalQuestionNumber(itemId: string): number | null {
  const idx = ASSESSMENT_QUESTIONS.findIndex((q) => q.id === itemId);
  if (idx >= 0) return idx + 1;
  const match = /^q0*(\d+)$/i.exec(itemId);
  return match ? Number(match[1]) : null;
}

export function labelForItemId(itemId: string): string {
  const n = globalQuestionNumber(itemId);
  return n != null ? `Question ${n}` : itemId;
}

function joinHumanList(labels: string[]): string {
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0]!;
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

/**
 * e.g. "3 answers have not been saved: Questions 12, 13, and 15."
 */
export function formatUnsavedAnswersMessage(itemIds: readonly string[]): string {
  const sorted = sortedUnique(itemIds);
  const count = sorted.length;
  if (count === 0) return "Some answers have not been saved.";

  const numbers = sorted
    .map((id) => globalQuestionNumber(id))
    .filter((n): n is number => n != null)
    .sort((a, b) => a - b);

  const answerWord = count === 1 ? "answer has" : "answers have";

  if (numbers.length === count) {
    const questionWord = count === 1 ? "Question" : "Questions";
    const list =
      count === 1
        ? `${questionWord} ${numbers[0]}`
        : count === 2
          ? `${questionWord} ${numbers[0]} and ${numbers[1]}`
          : `${questionWord} ${numbers.slice(0, -1).join(", ")}, and ${numbers[numbers.length - 1]}`;
    return `${count} ${answerWord} not been saved: ${list}.`;
  }

  const labels = sorted.map(labelForItemId);
  return `${count} ${answerWord} not been saved: ${joinHumanList(labels)}.`;
}

export function findQuestionLocation(itemId: string): {
  sectionIndex: number;
  questionIndex: number;
} | null {
  const sections = buildSections();
  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
    const questionIndex = sections[sectionIndex]!.questions.findIndex((q) => q.id === itemId);
    if (questionIndex >= 0) return { sectionIndex, questionIndex };
  }
  return null;
}
