"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AssessmentForm, type AssessmentAnswers } from "@/features/assessments";
import type { ClientModuleRecord } from "@/lib/modules";
import {
  INTAKE_FORM_SUBTITLE,
  INTAKE_FORM_TITLE,
  INTAKE_STICKY_HINT,
  INTAKE_SUBMIT_LABEL,
  INTAKE_SUBMIT_LABEL_LOADING,
} from "@/content/intake-experience";
import { formatLeaveUnsavedMessage } from "./answer-save-queue";
import { SaveIndicator } from "./save-indicator";
import { useAnswerSaveQueue } from "./use-answer-save-queue";
import { useModuleHydration } from "./use-module-hydration";

export function ScreenerModule({
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
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [focusItemId, setFocusItemId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [leaveDialog, setLeaveDialog] = useState<{
    href: string;
    message: string;
    itemIds: string[];
  } | null>(null);
  const readOnly = mod.status === "SUBMITTED" || mod.status === "COMPLETED";
  const answers = (mod.data ?? {}) as AssessmentAnswers;

  const queue = useAnswerSaveQueue({
    token,
    moduleKey: mod.moduleKey,
    enabled: hydrated && !readOnly,
    seedAnswers: answers,
    seedRevision: mod.responseRevision,
    onRevision: (revision) => {
      setMod((prev) =>
        prev.responseRevision === revision ? prev : { ...prev, responseRevision: revision },
      );
    },
  });

  const handleFocusConsumed = useCallback(() => setFocusItemId(null), []);

  const navigateTo = useCallback(
    (href: string) => {
      setLeaveDialog(null);
      router.push(href);
    },
    [router],
  );

  const tryLeave = useCallback(
    async (href: string) => {
      if (readOnly || !hydrated) {
        navigateTo(href);
        return;
      }
      setLeaving(true);
      setSubmitError(null);
      try {
        const ok = await queue.flushForNavigation();
        if (ok) {
          navigateTo(href);
          return;
        }
        const itemIds = queue.getUnsavedItemIds();
        setLeaveDialog({
          href,
          itemIds,
          message: formatLeaveUnsavedMessage(itemIds),
        });
      } finally {
        setLeaving(false);
      }
    },
    [hydrated, navigateTo, queue, readOnly],
  );

  const handleRetryAndLeave = async () => {
    if (!leaveDialog) return;
    setLeaving(true);
    try {
      queue.retrySave();
      const ok = await queue.flushForNavigation();
      if (ok) {
        navigateTo(leaveDialog.href);
        return;
      }
      const itemIds = queue.getUnsavedItemIds();
      setLeaveDialog({
        ...leaveDialog,
        itemIds,
        message: formatLeaveUnsavedMessage(itemIds),
      });
    } finally {
      setLeaving(false);
    }
  };

  const handleSubmit = async (next: AssessmentAnswers) => {
    if (!hydrated || readOnly) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      queue.onAnswersChange(next);
      const flushed = await queue.flush();
      if (!flushed) {
        throw new Error(
          queue.leaveUnsavedMessage ??
            queue.unsavedMessage ??
            "Please wait until all answers are saved before sharing.",
        );
      }

      const res = await fetch(`/api/intake/${token}/modules/${mod.moduleKey}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: queue.getLocalAnswers(),
          expectedRevision: queue.getRevision(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 422 && data.code === "incomplete") {
        if (data.module?.responseRevision != null) {
          setMod((prev) => ({
            ...prev,
            responseRevision: data.module.responseRevision,
          }));
        }
        throw new Error(
          data.error ??
            "Please answer all scored questions before sharing. Your saved answers were kept.",
        );
      }
      if (res.status === 409 && data.code === "conflict") {
        if (typeof data.module?.responseRevision === "number") {
          setMod((prev) => ({
            ...prev,
            responseRevision: data.module.responseRevision,
          }));
        }
        queue.onAnswersChange(queue.getLocalAnswers());
        throw new Error(
          data.error ??
            "Saved answers changed in another tab. Retry saving, then share again.",
        );
      }
      if (!res.ok) {
        throw new Error(data.error ?? "Submit failed");
      }
      router.push(journeyHref);
      router.refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setSubmitting(false);
    }
  };

  const showUnsavedBanner = Boolean(queue.unsavedMessage);
  const firstUnsaved = queue.unsavedItemIds[0] ?? null;

  return (
    <div>
      <div className="intake-sticky-bar">
        <div className="intake-sticky-bar-inner">
          <button
            type="button"
            className="text-sm text-slate-600 hover:text-slate-900"
            disabled={leaving}
            onClick={() => void tryLeave(journeyHref)}
          >
            ← Assessment Journey
          </button>
          <span className="text-sm text-slate-500">
            {leaving
              ? "Saving your answers…"
              : hydrated
                ? INTAKE_STICKY_HINT
                : "Loading saved answers…"}
          </span>
          <SaveIndicator status={hydrated ? queue.saveStatus : "idle"} />
        </div>
      </div>
      {(hydrateError || submitError || showUnsavedBanner) && (
        <div className="mx-auto max-w-2xl space-y-2 px-6 pt-4 text-sm text-amber-800">
          {hydrateError && <p>{hydrateError}</p>}
          {submitError && <p>{submitError}</p>}
          {showUnsavedBanner && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="text-left underline decoration-amber-700/50 underline-offset-2 hover:decoration-amber-800"
                onClick={() => {
                  if (firstUnsaved) setFocusItemId(firstUnsaved);
                }}
              >
                {queue.unsavedMessage}
              </button>
              <button
                type="button"
                className="rounded border border-amber-700/40 bg-amber-50 px-2.5 py-1 text-amber-950 hover:bg-amber-100"
                onClick={() => queue.retrySave()}
              >
                Retry saving
              </button>
            </div>
          )}
        </div>
      )}
      {leaveDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-unsaved-title"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
            <h2 id="leave-unsaved-title" className="text-base font-semibold text-slate-900">
              Answers not saved
            </h2>
            <p className="mt-2 text-sm text-amber-900">{leaveDialog.message}</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                className="rounded bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
                disabled={leaving}
                onClick={() => void handleRetryAndLeave()}
              >
                {leaving ? "Saving…" : "Retry saving"}
              </button>
              <button
                type="button"
                className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-800 hover:bg-slate-50"
                disabled={leaving}
                onClick={() => setLeaveDialog(null)}
              >
                Stay on page
              </button>
              <button
                type="button"
                className="rounded border border-amber-700/40 px-3 py-2 text-sm text-amber-950 hover:bg-amber-50"
                disabled={leaving}
                onClick={() => navigateTo(leaveDialog.href)}
              >
                Leave without saving
              </button>
            </div>
          </div>
        </div>
      )}
      {hydrated ? (
        <AssessmentForm
          key={`${mod.id}-hydrated`}
          initialAnswers={answers}
          onAnswersChange={readOnly ? undefined : queue.onAnswersChange}
          onComplete={readOnly ? undefined : handleSubmit}
          title={INTAKE_FORM_TITLE}
          subtitle={INTAKE_FORM_SUBTITLE}
          readOnly={readOnly}
          submitLabel={submitting ? INTAKE_SUBMIT_LABEL_LOADING : INTAKE_SUBMIT_LABEL}
          submitDisabled={
            submitting || leaving || !queue.canSubmit || queue.hasUnsavedWork || queue.saveStatus === "saving"
          }
          focusItemId={focusItemId}
          onFocusItemConsumed={handleFocusConsumed}
        />
      ) : (
        <p className="mx-auto max-w-2xl px-6 py-16 text-sm text-slate-600">
          Loading your saved answers…
        </p>
      )}
    </div>
  );
}
