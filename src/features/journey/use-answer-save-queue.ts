"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AssessmentAnswers } from "@/features/assessments";
import type { SaveStatus } from "./save-indicator";
import {
  applySaveConflict,
  applySaveFailure,
  applySaveSuccess,
  beginSave,
  canSubmit,
  createInitialQueueState,
  formatUnsavedAnswersMessage,
  hasUnsavedWork,
  noteLocalAnswers,
  prepareRetry,
  unsavedItemIdsForDisplay,
  type AnswerSaveQueueState,
} from "./answer-save-queue";

type UseAnswerSaveQueueOptions = {
  token: string;
  moduleKey: string;
  enabled: boolean;
  seedAnswers: AssessmentAnswers;
  seedRevision: number | null;
  debounceMs?: number;
  /** Called when the server reports a new revision (metadata only — never replaces local answers). */
  onRevision?: (revision: number) => void;
};

export type AnswerSaveQueueApi = {
  saveStatus: SaveStatus;
  queueState: AnswerSaveQueueState;
  unsavedItemIds: string[];
  unsavedMessage: string | null;
  canSubmit: boolean;
  hasUnsavedWork: boolean;
  onAnswersChange: (next: AssessmentAnswers) => void;
  retrySave: () => void;
  /** Flush pending saves; resolves true only when clean and not in error. */
  flush: () => Promise<boolean>;
  getLocalAnswers: () => AssessmentAnswers;
  getRevision: () => number | null;
};

export function useAnswerSaveQueue({
  token,
  moduleKey,
  enabled,
  seedAnswers,
  seedRevision,
  debounceMs = 800,
  onRevision,
}: UseAnswerSaveQueueOptions): AnswerSaveQueueApi {
  const [queueState, setQueueState] = useState<AnswerSaveQueueState>(() =>
    createInitialQueueState(seedAnswers, seedRevision),
  );

  const stateRef = useRef(queueState);
  const localRef = useRef<AssessmentAnswers>(seedAnswers);
  const enabledRef = useRef(enabled);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activePumpRef = useRef<Promise<void> | null>(null);
  const seededRef = useRef(false);
  const onRevisionRef = useRef(onRevision);

  useEffect(() => {
    stateRef.current = queueState;
  }, [queueState]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    onRevisionRef.current = onRevision;
  }, [onRevision]);

  useEffect(() => {
    if (!enabled) {
      seededRef.current = false;
      return;
    }
    if (seededRef.current) return;
    seededRef.current = true;
    localRef.current = seedAnswers;
    const next = createInitialQueueState(seedAnswers, seedRevision);
    stateRef.current = next;
    setQueueState(next);
  }, [enabled, seedAnswers, seedRevision]);

  const setState = useCallback((next: AnswerSaveQueueState) => {
    stateRef.current = next;
    setQueueState(next);
  }, []);

  const runPump = useCallback((): Promise<void> => {
    if (!enabledRef.current) return Promise.resolve();

    if (activePumpRef.current) {
      return activePumpRef.current.then(() => {
        if (
          enabledRef.current &&
          !stateRef.current.inFlight &&
          stateRef.current.dirtyItemIds.length > 0 &&
          stateRef.current.status !== "error"
        ) {
          return runPump();
        }
      });
    }

    const pump = (async () => {
      while (enabledRef.current) {
        const { state: next, request } = beginSave(stateRef.current, localRef.current);
        setState(next);
        if (!request) break;

        try {
          const res = await fetch(`/api/intake/${token}/modules/${moduleKey}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              data: request.data,
              expectedRevision: request.expectedRevision,
            }),
          });
          const data = await res.json().catch(() => ({}));

          if (res.status === 409 && data.code === "conflict") {
            const rev =
              typeof data.module?.responseRevision === "number"
                ? data.module.responseRevision
                : stateRef.current.revision;
            setState(applySaveConflict(stateRef.current, rev, localRef.current));
            if (typeof rev === "number") onRevisionRef.current?.(rev);
            continue;
          }

          if (!res.ok) {
            setState(
              applySaveFailure(
                stateRef.current,
                localRef.current,
                typeof data.error === "string" ? data.error : "Save failed",
              ),
            );
            break;
          }

          const rev =
            typeof data.module?.responseRevision === "number"
              ? data.module.responseRevision
              : stateRef.current.revision;
          setState(applySaveSuccess(stateRef.current, localRef.current, rev));
          if (typeof rev === "number") onRevisionRef.current?.(rev);
        } catch {
          setState(
            applySaveFailure(stateRef.current, localRef.current, "Save failed"),
          );
          break;
        }
      }
    })();

    const tracked = pump.finally(() => {
      if (activePumpRef.current === tracked) activePumpRef.current = null;
    });
    activePumpRef.current = tracked;
    return tracked;
  }, [moduleKey, setState, token]);

  const schedulePump = useCallback(() => {
    if (!enabledRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void runPump();
    }, debounceMs);
  }, [debounceMs, runPump]);

  const onAnswersChange = useCallback(
    (next: AssessmentAnswers) => {
      if (!enabledRef.current) return;
      localRef.current = next;
      setState(noteLocalAnswers(stateRef.current, next));
      schedulePump();
    },
    [schedulePump, setState],
  );

  const retrySave = useCallback(() => {
    if (!enabledRef.current) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setState(prepareRetry(stateRef.current, localRef.current));
    void runPump();
  }, [runPump, setState]);

  const flush = useCallback(async () => {
    if (!enabledRef.current) return true;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (stateRef.current.status === "error") {
      setState(prepareRetry(stateRef.current, localRef.current));
    }
    await runPump();
    if (
      stateRef.current.dirtyItemIds.length > 0 &&
      stateRef.current.status !== "error" &&
      !stateRef.current.inFlight
    ) {
      await runPump();
    }
    return canSubmit(stateRef.current);
  }, [runPump, setState]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!enabledRef.current) return;
      if (!hasUnsavedWork(stateRef.current)) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const displayIds =
    queueState.status === "error"
      ? unsavedItemIdsForDisplay(queueState).length > 0
        ? unsavedItemIdsForDisplay(queueState)
        : queueState.dirtyItemIds
      : queueState.dirtyItemIds;

  const unsavedMessage =
    queueState.status === "error" ? formatUnsavedAnswersMessage(displayIds) : null;

  return {
    saveStatus: queueState.status === "idle" ? "idle" : queueState.status,
    queueState,
    unsavedItemIds: displayIds,
    unsavedMessage,
    canSubmit: canSubmit(queueState),
    hasUnsavedWork: hasUnsavedWork(queueState),
    onAnswersChange,
    retrySave,
    flush,
    getLocalAnswers: () => localRef.current,
    getRevision: () => stateRef.current.revision,
  };
}
