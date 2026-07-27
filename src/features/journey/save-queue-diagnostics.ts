/**
 * Temporary development-only screener save diagnostics.
 * Enable with NODE_ENV=development, or localStorage.setItem("DEBUG_SCREENER_SAVE", "1").
 * Never logs client names. Answer values are included only in development builds.
 */

export type SaveDiagEvent = {
  t: number;
  type: string;
  /** itemIds only — never client identity */
  itemIds?: string[];
  /** Development only */
  values?: Record<string, string>;
  localCount?: number;
  dirtyItemIds?: string[];
  snapshotItemIds?: string[];
  expectedRevision?: number | null;
  returnedRevision?: number | null;
  serverStoredCount?: number | null;
  status?: number | string;
  dirty?: boolean;
  inFlight?: boolean;
  sectionIndex?: number;
  questionIndex?: number;
  questionId?: string | null;
  note?: string;
};

const STORAGE_KEY = "nl_screener_save_diag";
const MAX_EVENTS = 400;

function isDiagEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NODE_ENV === "development") return true;
  try {
    return window.localStorage?.getItem("DEBUG_SCREENER_SAVE") === "1";
  } catch {
    return false;
  }
}

function allowValues(): boolean {
  return process.env.NODE_ENV === "development";
}

function readLog(): SaveDiagEvent[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SaveDiagEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLog(events: SaveDiagEvent[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    // ignore quota
  }
}

export function screenerSaveDiag(event: Omit<SaveDiagEvent, "t"> & { values?: Record<string, string> }) {
  if (!isDiagEnabled()) return;

  const entry: SaveDiagEvent = {
    t: Date.now(),
    type: event.type,
    itemIds: event.itemIds,
    localCount: event.localCount,
    dirtyItemIds: event.dirtyItemIds,
    snapshotItemIds: event.snapshotItemIds,
    expectedRevision: event.expectedRevision,
    returnedRevision: event.returnedRevision,
    serverStoredCount: event.serverStoredCount,
    status: event.status,
    dirty: event.dirty,
    inFlight: event.inFlight,
    sectionIndex: event.sectionIndex,
    questionIndex: event.questionIndex,
    questionId: event.questionId,
    note: event.note,
  };

  if (allowValues() && event.values) {
    entry.values = event.values;
  }

  const log = readLog();
  log.push(entry);
  writeLog(log);

  // Console: itemIds always; values only in development
  if (allowValues()) {
    console.info("[screener-save]", entry);
  } else {
    console.info("[screener-save]", { ...entry, values: undefined });
  }
}

export function screenerSaveDiagSnapshot(label: string, extra?: Partial<SaveDiagEvent>) {
  screenerSaveDiag({ type: label, ...extra });
}

/** Expose helpers for manual browser inspection during the investigation. */
export function installScreenerSaveDiagGlobals() {
  if (typeof window === "undefined" || !isDiagEnabled()) return;
  const w = window as Window & {
    __screenerSaveDiag?: {
      dump: () => SaveDiagEvent[];
      clear: () => void;
      summary: () => {
        localItemIds: string[];
        patchedItemIds: string[];
        missingFromPatches: string[];
        events: number;
      };
    };
  };
  w.__screenerSaveDiag = {
    dump: () => readLog(),
    clear: () => {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    },
    summary: () => {
      const events = readLog();
      const localItemIds = new Set<string>();
      const patchedItemIds = new Set<string>();
      for (const e of events) {
        if (e.type === "local_answers" && e.itemIds) {
          for (const id of e.itemIds) localItemIds.add(id);
        }
        if (e.type === "patch_start" && e.snapshotItemIds) {
          for (const id of e.snapshotItemIds) patchedItemIds.add(id);
        }
      }
      const local = [...localItemIds].sort();
      const patched = [...patchedItemIds].sort();
      const missingFromPatches = local.filter((id) => !patchedItemIds.has(id));
      return {
        localItemIds: local,
        patchedItemIds: patched,
        missingFromPatches,
        events: events.length,
      };
    },
  };
}
