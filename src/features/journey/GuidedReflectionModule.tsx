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

export function GuidedReflectionModule({
  token,
  module: initial,
}: {
  token: string;
  module: ClientModuleRecord;
}) {
  const router = useRouter();
  const [mod, setMod] = useState(initial);
  const [data, setData] = useState<GuidedReflectionData>(() =>
    parseGuidedReflectionData(initial.data),
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  const readOnly = mod.status === "SUBMITTED" || mod.status === "COMPLETED";

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
    if (readOnly) return;
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/intake/${token}/modules/${mod.moduleKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: next }),
      });
      if (!res.ok) throw new Error("Save failed");
      const json = await res.json();
      setMod(json.module);
      dirtyRef.current = false;
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }, 800);

  const updateField = useCallback(
    (key: keyof GuidedReflectionData, value: string) => {
      setData((prev) => {
        const next = { ...prev, [key]: value };
        dirtyRef.current = true;
        setSaveStatus("idle");
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/intake/${token}/modules/${mod.moduleKey}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
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

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/intake/${token}`} className="text-sm text-slate-600 hover:text-slate-900">
          ← Assessment Journey
        </Link>
        <SaveIndicator status={saveStatus} />
      </div>

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

      {submitError && <p className="mt-4 text-sm text-red-600">{submitError}</p>}
    </div>
  );
}
