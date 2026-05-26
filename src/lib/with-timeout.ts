export function getTimeoutMs(
  envVar: string | undefined,
  defaultMs: number,
): number {
  if (!envVar) return defaultMs;
  const parsed = Number(envVar);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultMs;
}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)),
      ms,
    );
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 30_000, ...rest } = init;
  return fetch(input, {
    ...rest,
    signal: AbortSignal.timeout(timeoutMs),
  });
}
