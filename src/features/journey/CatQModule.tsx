"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CAT_Q_ITEMS,
  CatQForm,
  isCatQComplete,
  type CatQAnswers,
} from "@/features/cat-q";
import { useDebouncedCallback } from "@/lib/hooks/useDebouncedCallback";
import type { ClientModuleRecord } from "@/lib/modules";
import { SaveIndicator, type SaveStatus } from "./save-indicator";
import { useModuleHydration } from "./use-module-hydration";

function parseAnswers(data: unknown): CatQAnswers {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const answers: CatQAnswers = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 7) {
      answers[key] = value as CatQAnswers[string];
    } else if (typeof value === "string" && value.trim() !== "") {
      const n = Number(value);
      if (Number.isInteger(n) && n >= 1 && n <= 7) {
        answers[key] = n as CatQAnswers[string];
      }
    }
  }
  return answers;
}

export function CatQModule({
  token,
  module: initial,
}: {
  token: string;
  module: ClientModuleRecord;
}) {
  const router = useRouter();
  const journeyHref = `/intake/${token}`;
  const { mod, setMod, hydrated, hydrateError } = useModuleHydration(
    token,
    initial.moduleKey,
    initial,
  );
  const [answers, setAnswers] = useState<CatQAnswers>(() => parseAnswers(initial.data));
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [focusItemId, setFocusItemId] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  const revisionRef = useRef(mod.responseRevision);
  const hydratedOnceRef = useRef(false);
  const readOnly = mod.status === "SUBMITTED" || mod.status === "COMPLETED";

  useEffect(() => {
    revisionRef.current = mod.responseRevision;
  }, [mod.responseRevision]);

  useEffect(() => {
    if (!hydrated || hydratedOnceRef.current || dirtyRef.current) return;
    hydratedOnceRef.current = true;
    setAnswers(parseAnswers(mod.data));
  }, [hydrated, mod.data]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current && saveStatus === "error") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [saveStatus]);

  const persist = useDebouncedCallback(async (next: CatQAnswers) => {
    if (readOnly || !hydrated) return;
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/intake/${token}/modules/${mod.moduleKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: next,
          expectedRevision: revisionRef.current,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 409 && json.code === "conflict" && json.module) {
        setMod(json.module);
        setAnswers(parseAnswers(json.module.data));
        dirtyRef.current = false;
        setSaveStatus("error");
        setSubmitError(
          json.error ??
            "Saved answers changed in another tab. Reloaded your latest saved copy.",
        );
        return;
      }
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setMod(json.module);
      dirtyRef.current = false;
      setSaveStatus("saved");
      setSubmitError(null);
    } catch {
      setSaveStatus("error");
    }
  }, 800);

  const handleChange = useCallback(
    (next: CatQAnswers) => {
      setAnswers(next);
      dirtyRef.current = true;
      setSaveStatus("saving");
      persist(next);
    },
    [persist],
  );

  const handleSubmit = async () => {
    if (!hydrated || readOnly) return;
    if (!isCatQComplete(answers, CAT_Q_ITEMS)) {
      const missing = CAT_Q_ITEMS.find((item) => answers[item.id] === undefined);
      setFocusItemId(missing?.id ?? null);
      setSubmitError("Please answer all 25 items before submitting.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      // Flush pending debounce first by sending current answers.
      const saveRes = await fetch(`/api/intake/${token}/modules/${mod.moduleKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: answers,
          expectedRevision: revisionRef.current,
        }),
      });
      const saveJson = await saveRes.json().catch(() => ({}));
      if (saveRes.ok && saveJson.module) {
        setMod(saveJson.module);
        revisionRef.current = saveJson.module.responseRevision;
      }

      const res = await fetch(`/api/intake/${token}/modules/${mod.moduleKey}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: answers,
          expectedRevision: revisionRef.current,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 422 && json.missingItemIds?.length) {
        setFocusItemId(json.missingItemIds[0] ?? null);
        setSubmitError(json.error ?? "Please answer all items before submitting.");
        if (json.module) setMod(json.module);
        return;
      }
      if (!res.ok) {
        setSubmitError(json.error ?? "Could not submit. Please try again.");
        if (json.module) setMod(json.module);
        return;
      }
      if (json.module) setMod(json.module);
      dirtyRef.current = false;
      router.push(journeyHref);
      router.refresh();
    } catch {
      setSubmitError("Could not submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (hydrateError) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-sm text-red-700">{hydrateError}</p>
        <Link href={journeyHref} className="mt-4 inline-block text-sm text-[var(--accent)]">
          ← Back to journey
        </Link>
      </div>
    );
  }

  const answeredCount = CAT_Q_ITEMS.filter((item) => answers[item.id] !== undefined).length;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={journeyHref}
          className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          ← Assessment journey
        </Link>
        <SaveIndicator status={readOnly ? "idle" : saveStatus} />
      </div>

      <header className="mb-8">
        <h1 className="ui-page-title">
          Camouflaging Autistic Traits Questionnaire (CAT-Q)
        </h1>
        <p className="ui-page-lead mt-2">
          Please read each statement below and choose the answer that best fits your
          experiences during social interactions. You can leave and return using the same
          link — your answers are saved as you go.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          {answeredCount} of {CAT_Q_ITEMS.length} answered
          {readOnly ? " · Submitted" : ""}
        </p>
      </header>

      <CatQForm
        answers={answers}
        onChange={handleChange}
        readOnly={readOnly || !hydrated}
        focusItemId={focusItemId}
        onFocusItemConsumed={() => setFocusItemId(null)}
      />

      {submitError && (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {submitError}
        </p>
      )}

      {!readOnly && (
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            className="ui-btn ui-btn-primary"
            disabled={submitting || !hydrated}
            onClick={handleSubmit}
          >
            {submitting ? "Submitting…" : "Submit CAT-Q"}
          </button>
          <Link href={journeyHref} className="ui-btn ui-btn-secondary">
            Save and return later
          </Link>
        </div>
      )}
    </div>
  );
}
