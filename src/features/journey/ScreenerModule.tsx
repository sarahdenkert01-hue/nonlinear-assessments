"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AssessmentForm, type AssessmentAnswers } from "@/features/assessments";
import { useDebouncedCallback } from "@/lib/hooks/useDebouncedCallback";
import type { ClientModuleRecord } from "@/lib/modules";
import {
  INTAKE_FORM_SUBTITLE,
  INTAKE_FORM_TITLE,
  INTAKE_STICKY_HINT,
  INTAKE_SUBMIT_LABEL,
  INTAKE_SUBMIT_LABEL_LOADING,
} from "@/content/intake-experience";
import { SaveIndicator, type SaveStatus } from "./save-indicator";
import { useModuleHydration } from "./use-module-hydration";

export function ScreenerModule({
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
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const revisionRef = useRef(mod.responseRevision);
  const readOnly = mod.status === "SUBMITTED" || mod.status === "COMPLETED";
  const answers = (mod.data ?? {}) as AssessmentAnswers;

  useEffect(() => {
    revisionRef.current = mod.responseRevision;
  }, [mod.responseRevision]);

  const saveAnswers = useDebouncedCallback(async (next: AssessmentAnswers) => {
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
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.code === "conflict" && data.module) {
        setMod(data.module);
        setSaveStatus("error");
        setSubmitError(
          data.error ?? "Saved answers changed in another tab. Reloaded your latest saved copy.",
        );
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setMod(data.module);
      setSaveStatus("saved");
      setSubmitError(null);
    } catch {
      setSaveStatus("error");
    }
  }, 800);

  const handleAnswersChange = useCallback(
    (next: AssessmentAnswers) => {
      if (!hydrated || readOnly) return;
      setSaveStatus("idle");
      saveAnswers(next);
    },
    [hydrated, readOnly, saveAnswers],
  );

  const handleSubmit = async (next: AssessmentAnswers) => {
    if (!hydrated || readOnly) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/intake/${token}/modules/${mod.moduleKey}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: next,
          expectedRevision: revisionRef.current,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 422 && data.code === "incomplete") {
        if (data.module) setMod(data.module);
        throw new Error(
          data.error ??
            "Please answer all scored questions before sharing. Your saved answers were kept.",
        );
      }
      if (res.status === 409 && data.code === "conflict" && data.module) {
        setMod(data.module);
        throw new Error(
          data.error ?? "Saved answers changed in another tab. Reloaded your latest saved copy.",
        );
      }
      if (!res.ok) {
        throw new Error(data.error ?? "Submit failed");
      }
      router.push(`/intake/${token}`);
      router.refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="intake-sticky-bar">
        <div className="intake-sticky-bar-inner">
          <Link href={`/intake/${token}`} className="text-sm text-slate-600 hover:text-slate-900">
            ← Assessment Journey
          </Link>
          <span className="text-sm text-slate-500">
            {hydrated ? INTAKE_STICKY_HINT : "Loading saved answers…"}
          </span>
          <SaveIndicator status={hydrated ? saveStatus : "idle"} />
        </div>
      </div>
      {(hydrateError || submitError) && (
        <p className="mx-auto max-w-2xl px-6 pt-4 text-sm text-amber-800">
          {submitError ?? hydrateError}
        </p>
      )}
      {hydrated ? (
        <AssessmentForm
          key={`${mod.id}-hydrated`}
          initialAnswers={answers}
          onAnswersChange={readOnly ? undefined : handleAnswersChange}
          onComplete={readOnly ? undefined : handleSubmit}
          title={INTAKE_FORM_TITLE}
          subtitle={INTAKE_FORM_SUBTITLE}
          readOnly={readOnly}
          submitLabel={submitting ? INTAKE_SUBMIT_LABEL_LOADING : INTAKE_SUBMIT_LABEL}
        />
      ) : (
        <p className="mx-auto max-w-2xl px-6 py-16 text-sm text-slate-600">
          Loading your saved answers…
        </p>
      )}
    </div>
  );
}
