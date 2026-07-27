"use client";

import { useEffect, useState } from "react";
import type { ClientModuleRecord } from "@/lib/modules";

/**
 * Load the latest server module before enabling autosave/submit.
 * Prevents hydration from writing and ensures remounts start from DB state.
 */
export function useModuleHydration(
  token: string,
  moduleKey: string,
  initial: ClientModuleRecord,
): {
  mod: ClientModuleRecord;
  setMod: React.Dispatch<React.SetStateAction<ClientModuleRecord>>;
  hydrated: boolean;
  hydrateError: string | null;
} {
  const [mod, setMod] = useState(initial);
  const [hydrated, setHydrated] = useState(false);
  const [hydrateError, setHydrateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    setHydrateError(null);

    (async () => {
      try {
        const res = await fetch(`/api/intake/${token}/modules/${moduleKey}`);
        if (!res.ok) throw new Error("Failed to load saved answers");
        const data = await res.json();
        if (cancelled) return;
        if (data.module) setMod(data.module as ClientModuleRecord);
        setHydrated(true);
      } catch {
        if (cancelled) return;
        // Fall back to server-rendered props so the client can still continue.
        setMod(initial);
        setHydrateError("Could not refresh saved answers; showing last loaded copy.");
        setHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally depend on token/moduleKey only — initial is the SSR seed for this mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, moduleKey]);

  return { mod, setMod, hydrated, hydrateError };
}
