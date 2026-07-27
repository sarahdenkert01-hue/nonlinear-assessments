"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDebouncedCallback } from "@/lib/hooks/useDebouncedCallback";
import {
  GUIDED_REFLECTION_SECTIONS,
  parseGuidedReflectionData,
  type ClientModuleRecord,
  type GuidedReflectionData,
} from "@/lib/modules";
import { SaveIndicator, type SaveStatus } from "./save-indicator";
import { useModuleHydration } from "./use-module-hydration";

export function GuidedReflectionModule({
  token,
  module: initial,
}: {
  token: string;
  module: ClientModuleRecord;
}) {
  const router = useRouter();
  const { mod, setMod, hydrated, hydrateError } = useModuleHydration(
    token,
    initial.moduleKey,
    initial,
  );
  const [data, setData] = useState<GuidedReflectionData>(() =>
    parseGuidedReflectionData(initial.data),
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
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
    setData(parseGuidedReflectionData(mod.data));
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

  const persist = useDebouncedCallback(async (next: GuidedReflectionData) => {
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
        setData(parseGuidedReflectionData(json.module.data));
        setSaveStatus("error");
        setSubmitError(
          json.error ?? "Saved answers changed in another tab. Reloaded your latest saved copy.",
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

  const updateField = useCallback(
    (key: keyof GuidedReflectionData, value: string) => {
      if (!hydrated || readOnly) return;
      setData((prev) => {
        const next = { ...prev, [key]: value };
        dirtyRef.current = true;
        setSaveStatus("idle");
        persist(next);
        return next;
      });
    },
    [hydrated, persist, readOnly],
  );

  const handleSubmit = async () => {
    if (!hydrated || readOnly) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/intake/${token}/modules/${mod.moduleKey}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data,
          expectedRevision: revisionRef.current,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 409 && json.code === "conflict" && json.module) {
        setMod(json.module);
        setData(parseGuidedReflectionData(json.module.data));
        throw new Error(
          json.error ?? "Saved answers changed in another tab. Reloaded your latest saved copy.",
        );
      }
      if (!res.ok) {
        throw new Error(json.error ?? "Submit failed");
      }
      dirtyRef.current = false;
      router.push(`/intake/${token}`);
      router.refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-sm text-slate-600">
        Loading your saved answers…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/intake/${token}`} className="text-sm text-slate-600 hover:text-slate-900">
          ← Assessment Journey
        </Link>
        <SaveIndicator status={saveStatus} />
      </div>

      {(hydrateError || submitError) && (
        <p className="mb-4 text-sm text-amber-800">{submitError ?? hydrateError}</p>
      )}

      <header className="mb-8">
        <h1 className="ui-page-title">{mod.title}</h1>
        <p className="ui-page-lead mt-2">
          Take your time with these prompts. You can skip any section and come back later —
          nothing here is graded.
        </p>
      </header>

      <div className="space-y-8">
        {GUIDED_REFLECTION_SECTIONS.map((section) => (
          <section key={section.key} className="ui-card px-5 py-5">
            <h2 className="text-base font-semibold text-slate-900">{section.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{section.prompt}</p>
            <label className="ui-label mt-4" htmlFor={`reflection-${section.key}`}>
              Your response
            </label>
            <textarea
              id={`reflection-${section.key}`}
              className="ui-input min-h-[8rem] resize-y"
              value={data[section.key] ?? ""}
              onChange={(e) => updateField(section.key, e.target.value)}
              readOnly={readOnly}
              disabled={readOnly}
              placeholder="Write as much or as little as feels right…"
            />
          </section>
        ))}
      </div>

      {!readOnly && (
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="ui-btn ui-btn-primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Submitting…" : "Submit reflection"}
          </button>
          <Link href={`/intake/${token}`} className="ui-btn ui-btn-ghost">
            Save and return
          </Link>
        </div>
      )}
    </div>
  );
}
