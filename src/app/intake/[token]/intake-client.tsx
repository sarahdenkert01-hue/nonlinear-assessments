"use client";

import { useCallback, useState } from "react";
import { AssessmentForm, type AssessmentAnswers } from "@/features/assessments";
import { hasConsent } from "@/lib/intake-access";
import { useDebouncedCallback } from "@/lib/hooks/useDebouncedCallback";
import type { AssessmentSessionRecord } from "@/lib/sessions";
import { IntakeConsent } from "./intake-consent";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function IntakeClient({ session: initialSession }: { session: AssessmentSessionRecord }) {
  const [session, setSession] = useState(initialSession);

  if (!hasConsent(session) && session.status === "DRAFT") {
    return (
      <IntakeConsent
        session={session}
        onAccepted={(updated) => setSession(updated)}
      />
    );
  }

  return <IntakeQuestionnaire session={session} onSessionChange={setSession} />;
}

function IntakeQuestionnaire({
  session: initialSession,
  onSessionChange,
}: {
  session: AssessmentSessionRecord;
  onSessionChange: (s: AssessmentSessionRecord) => void;
}) {
  const [session, setSession] = useState(initialSession);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isSubmitted = session.status !== "DRAFT";

  const updateSession = (next: AssessmentSessionRecord) => {
    setSession(next);
    onSessionChange(next);
  };

  const saveAnswers = useDebouncedCallback(async (answers: AssessmentAnswers) => {
    if (session.status !== "DRAFT") return;
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/intake/${session.token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      updateSession(data.session);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }, 800);

  const handleAnswersChange = useCallback(
    (answers: AssessmentAnswers) => {
      setSaveStatus("idle");
      saveAnswers(answers);
    },
    [saveAnswers],
  );

  const handleSubmit = async (answers: AssessmentAnswers) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/intake/${session.token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Submit failed");
      }
      const data = await res.json();
      updateSession(data.session);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="assessment-root">
        <div className="assessment-shell">
          <header className="assessment-header">
            <h1 className="assessment-title">Thank you</h1>
            <p className="assessment-subtitle">
              Your responses have been submitted. Your clinician will review them
              before your assessment.
            </p>
            {session.submittedAt && (
              <p className="assessment-theme-meta" style={{ marginTop: "1rem" }}>
                Submitted {new Date(session.submittedAt).toLocaleString()}
              </p>
            )}
          </header>
          <AssessmentForm
            initialAnswers={session.answers}
            readOnly
            title="Your submitted responses"
            subtitle="This form is now read-only."
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between text-xs text-gray-500">
          <span>Your progress is saved automatically</span>
          <SaveIndicator status={saveStatus} />
        </div>
      </div>
      <AssessmentForm
        initialAnswers={session.answers}
        onAnswersChange={handleAnswersChange}
        onComplete={handleSubmit}
        submitLabel={submitting ? "Submitting…" : "Submit questionnaire"}
        subtitle="You can leave and return using this same link."
      />
      {submitError && (
        <p className="mx-auto max-w-2xl px-6 pb-8 text-sm text-red-600">{submitError}</p>
      )}
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "saving") return <span>Saving…</span>;
  if (status === "saved") return <span className="text-green-600">Saved</span>;
  if (status === "error") return <span className="text-amber-600">Save failed</span>;
  return null;
}
