"use client";

import { useCallback, useState } from "react";
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

export function ScreenerModule({
  token,
  module: initial,
}: {
  token: string;
  module: ClientModuleRecord;
}) {
  const router = useRouter();
  const [mod, setMod] = useState(initial);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const readOnly = mod.status === "SUBMITTED" || mod.status === "COMPLETED";
  const answers = (mod.data ?? {}) as AssessmentAnswers;

  const saveAnswers = useDebouncedCallback(async (next: AssessmentAnswers) => {
    if (readOnly) return;
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/intake/${token}/modules/${mod.moduleKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: next }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      setMod(data.module);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }, 800);

  const handleAnswersChange = useCallback(
    (next: AssessmentAnswers) => {
      setSaveStatus("idle");
      saveAnswers(next);
    },
    [saveAnswers],
  );

  const handleSubmit = async (next: AssessmentAnswers) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/intake/${token}/modules/${mod.moduleKey}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
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
          <span className="text-sm text-slate-500">{INTAKE_STICKY_HINT}</span>
          <SaveIndicator status={saveStatus} />
        </div>
      </div>
      <AssessmentForm
        initialAnswers={answers}
        onAnswersChange={readOnly ? undefined : handleAnswersChange}
        onComplete={readOnly ? undefined : handleSubmit}
        title={INTAKE_FORM_TITLE}
        subtitle={INTAKE_FORM_SUBTITLE}
        readOnly={readOnly}
        submitLabel={submitting ? INTAKE_SUBMIT_LABEL_LOADING : INTAKE_SUBMIT_LABEL}
      />
      {submitError && (
        <p className="mx-auto max-w-2xl px-6 pb-8 text-sm text-red-600">{submitError}</p>
      )}
    </div>
  );
}
