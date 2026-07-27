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
  formatLeaveUnsavedMessage,
  formatUnsavedAnswersMessage,
  hasUnsavedWork,
  noteLocalAnswers,
  prepareRetry,
  unsavedItemIdsForDisplay,
  type AnswerSaveQueueState,
} from "./answer-save-queue";
import {
  installScreenerSaveDiagGlobals,
  screenerSaveDiag,
} from "./save-queue-diagnostics";

type UseAnswerSaveQueueOptions = {
  token: string;
  moduleKey: string;
  enabled: boolean;
  seedAnswers: AssessmentAnswers;
  seedRevision: number | null;
  debounceMs?: number;
  onRevision?: (revision: number) => void;
};

export type AnswerSaveQueueApi = {
  saveStatus: SaveStatus;
  queueState: AnswerSaveQueueState;
  unsavedItemIds: string[];
  unsavedMessage: string | null;
  leaveUnsavedMessage: string | null;
  canSubmit: boolean;
  hasUnsavedWork: boolean;
  onAnswersChange: (next: AssessmentAnswers) => void;
  retrySave: () => void;
  /** Flush pending saves; resolves true only when clean and not in error. */
  flush: () => Promise<boolean>;
  /** Cancel debounce and ensure latest local map is queued, then flush. */
  flushForNavigation: () => Promise<boolean>;
  getLocalAnswers: () => AssessmentAnswers;
  getRevision: () => number | null;
  getUnsavedItemIds: () => string[];
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
  const unmountedRef = useRef(false);
  const allowSetStateRef = useRef(true);

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
    installScreenerSaveDiagGlobals();
  }, []);

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
    screenerSaveDiag({
      type: "queue_seeded",
      itemIds: Object.keys(seedAnswers).sort(),
      values: seedAnswers,
      localCount: Object.keys(seedAnswers).length,
      expectedRevision: seedRevision,
      note: "initial lastSaved from hydration",
    });
  }, [enabled, seedAnswers, seedRevision]);

  const setState = useCallback((next: AnswerSaveQueueState) => {
    stateRef.current = next;
    if (allowSetStateRef.current && !unmountedRef.current) {
      setQueueState(next);
    }
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

        const snapshotItemIds = Object.keys(request.data).sort();
        screenerSaveDiag({
          type: "patch_start",
          snapshotItemIds,
          itemIds: snapshotItemIds,
          values: request.data,
          localCount: Object.keys(localRef.current).length,
          dirtyItemIds: next.dirtyItemIds,
          expectedRevision: request.expectedRevision,
        });

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
            screenerSaveDiag({
              type: "patch_conflict",
              status: 409,
              snapshotItemIds,
              expectedRevision: request.expectedRevision,
              returnedRevision: rev,
              serverStoredCount:
                data.module?.data && typeof data.module.data === "object"
                  ? Object.keys(data.module.data).length
                  : null,
            });
            setState(applySaveConflict(stateRef.current, rev, localRef.current));
            if (typeof rev === "number") onRevisionRef.current?.(rev);
            continue;
          }

          if (!res.ok) {
            screenerSaveDiag({
              type: "patch_failure",
              status: res.status,
              snapshotItemIds,
              expectedRevision: request.expectedRevision,
              note: typeof data.error === "string" ? data.error : "Save failed",
            });
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
          const serverStoredCount =
            data.module?.data && typeof data.module.data === "object"
              ? Object.keys(data.module.data as object).length
              : null;
          const after = applySaveSuccess(stateRef.current, localRef.current, rev);
          screenerSaveDiag({
            type: "patch_success",
            status: res.status,
            snapshotItemIds,
            expectedRevision: request.expectedRevision,
            returnedRevision: rev,
            serverStoredCount,
            dirtyItemIds: after.dirtyItemIds,
            localCount: Object.keys(localRef.current).length,
            note: `lastSavedCount=${Object.keys(after.lastSaved).length}`,
          });
          setState(after);
          if (typeof rev === "number") onRevisionRef.current?.(rev);
        } catch (err) {
          screenerSaveDiag({
            type: "patch_aborted_or_network",
            snapshotItemIds,
            expectedRevision: request.expectedRevision,
            note: err instanceof Error ? err.name : "unknown",
          });
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

  const promoteDebouncedWork = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
      screenerSaveDiag({
        type: "debounce_promoted",
        dirtyItemIds: stateRef.current.dirtyItemIds,
        localCount: Object.keys(localRef.current).length,
        itemIds: Object.keys(localRef.current).sort(),
      });
    }
    // Ensure latest local map is reflected as dirty before pumping.
    setState(noteLocalAnswers(stateRef.current, localRef.current));
  }, [setState]);

  const onAnswersChange = useCallback(
    (next: AssessmentAnswers) => {
      if (!enabledRef.current) return;
      localRef.current = next;
      const noted = noteLocalAnswers(stateRef.current, next);
      setState(noted);
      screenerSaveDiag({
        type: "local_answers",
        itemIds: Object.keys(next).sort(),
        values: next,
        localCount: Object.keys(next).length,
        dirtyItemIds: noted.dirtyItemIds,
        inFlight: Boolean(noted.inFlight),
      });
      schedulePump();
    },
    [schedulePump, setState],
  );

  const retrySave = useCallback(() => {
    if (!enabledRef.current) return;
    promoteDebouncedWork();
    setState(prepareRetry(stateRef.current, localRef.current));
    void runPump();
  }, [promoteDebouncedWork, runPump, setState]);

  const flush = useCallback(async () => {
    if (!enabledRef.current) return true;
    promoteDebouncedWork();
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
    const ok = canSubmit(stateRef.current);
    screenerSaveDiag({
      type: ok ? "flush_ok" : "flush_failed",
      dirtyItemIds: stateRef.current.dirtyItemIds,
      localCount: Object.keys(localRef.current).length,
      inFlight: Boolean(stateRef.current.inFlight),
      status: stateRef.current.status,
    });
    return ok;
  }, [promoteDebouncedWork, runPump, setState]);

  const flushForNavigation = useCallback(async () => {
    screenerSaveDiag({
      type: "flush_for_navigation",
      dirtyItemIds: stateRef.current.dirtyItemIds,
      localCount: Object.keys(localRef.current).length,
      inFlight: Boolean(stateRef.current.inFlight),
    });
    return flush();
  }, [flush]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      const dirty = stateRef.current.dirtyItemIds.length > 0;
      const inFlight = Boolean(stateRef.current.inFlight);
      screenerSaveDiag({
        type: "beforeunload",
        dirty,
        inFlight,
        dirtyItemIds: stateRef.current.dirtyItemIds,
        localCount: Object.keys(localRef.current).length,
        itemIds: Object.keys(localRef.current).sort(),
        note: hasUnsavedWork(stateRef.current) ? "will_prompt" : "no_prompt",
      });
      if (!enabledRef.current) return;
      if (!hasUnsavedWork(stateRef.current)) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const promoteDebouncedWorkRef = useRef(promoteDebouncedWork);
  const runPumpRef = useRef(runPump);
  promoteDebouncedWorkRef.current = promoteDebouncedWork;
  runPumpRef.current = runPump;

  useEffect(() => {
    unmountedRef.current = false;
    allowSetStateRef.current = true;
    return () => {
      // Promote pending debounce into an immediate pump (best-effort).
      // In-app navigation must await flushForNavigation() before unmounting.
      promoteDebouncedWorkRef.current();
      screenerSaveDiag({
        type: "queue_unmount",
        dirty: stateRef.current.dirtyItemIds.length > 0,
        inFlight: Boolean(stateRef.current.inFlight),
        dirtyItemIds: stateRef.current.dirtyItemIds,
        localCount: Object.keys(localRef.current).length,
        itemIds: Object.keys(localRef.current).sort(),
        note: hasUnsavedWork(stateRef.current)
          ? "best_effort_pump_after_promote"
          : "clean_unmount",
      });
      if (hasUnsavedWork(stateRef.current) && enabledRef.current) {
        allowSetStateRef.current = false;
        void runPumpRef.current();
      }
      unmountedRef.current = true;
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

  const leaveUnsavedMessage =
    displayIds.length > 0 ? formatLeaveUnsavedMessage(displayIds) : null;

  return {
    saveStatus: queueState.status === "idle" ? "idle" : queueState.status,
    queueState,
    unsavedItemIds: displayIds,
    unsavedMessage,
    leaveUnsavedMessage,
    canSubmit: canSubmit(queueState),
    hasUnsavedWork: hasUnsavedWork(queueState),
    onAnswersChange,
    retrySave,
    flush,
    flushForNavigation,
    getLocalAnswers: () => localRef.current,
    getRevision: () => stateRef.current.revision,
    getUnsavedItemIds: () => unsavedItemIdsForDisplay(stateRef.current),
  };
}
