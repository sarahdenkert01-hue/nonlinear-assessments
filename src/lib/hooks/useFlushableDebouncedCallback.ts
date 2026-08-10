import { useCallback, useEffect, useRef } from "react";

type AsyncFn<Args extends unknown[]> = (...args: Args) => Promise<void>;

/**
 * Debounced async callback with explicit flush/cancel for navigation safety.
 * Flush awaits the in-flight or pending call.
 */
export function useFlushableDebouncedCallback<Args extends unknown[]>(
  callback: AsyncFn<Args>,
  delayMs: number,
): {
  schedule: (...args: Args) => void;
  flush: () => Promise<void>;
  cancel: () => void;
} {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingArgsRef = useRef<Args | null>(null);
  const inflightRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    pendingArgsRef.current = null;
  }, []);

  const run = useCallback(async (args: Args) => {
    const task = callbackRef.current(...args);
    inflightRef.current = task.then(
      () => {
        if (inflightRef.current === task) inflightRef.current = null;
      },
      () => {
        if (inflightRef.current === task) inflightRef.current = null;
      },
    );
    await task;
  }, []);

  const flush = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const args = pendingArgsRef.current;
    pendingArgsRef.current = null;
    if (args) {
      await run(args);
      return;
    }
    if (inflightRef.current) {
      await inflightRef.current;
    }
  }, [run]);

  const schedule = useCallback(
    (...args: Args) => {
      pendingArgsRef.current = args;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        const next = pendingArgsRef.current;
        pendingArgsRef.current = null;
        if (next) void run(next);
      }, delayMs);
    },
    [delayMs, run],
  );

  useEffect(() => () => cancel(), [cancel]);

  return { schedule, flush, cancel };
}
