"use client";

import { useState } from "react";
import {
  INTAKE_CONSENT_CHECKBOX_LABEL,
  INTAKE_CONSENT_SECTIONS,
  INTAKE_CONSENT_TITLE,
} from "@/content/intake-consent";
import type { AssessmentSessionRecord } from "@/lib/sessions";

export function IntakeConsent({
  session,
  onAccepted,
}: {
  session: AssessmentSessionRecord;
  onAccepted: (session: AssessmentSessionRecord) => void;
}) {
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!checked) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/intake/${session.token}/consent`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not record consent");
      }
      const data = await res.json();
      onAccepted(data.session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <main className="mx-auto max-w-lg px-6 py-12">
        <h1 className="text-2xl font-semibold text-gray-900">{INTAKE_CONSENT_TITLE}</h1>
        {session.clientName && (
          <p className="mt-2 text-sm text-gray-600">
            Questionnaire for {session.clientName}
          </p>
        )}
        <div className="mt-8 space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {INTAKE_CONSENT_SECTIONS.map((section) => (
            <div key={section.heading}>
              <h2 className="text-sm font-semibold text-gray-900">{section.heading}</h2>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">{section.body}</p>
            </div>
          ))}
        </div>
        <label className="mt-8 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">{INTAKE_CONSENT_CHECKBOX_LABEL}</span>
        </label>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        <button
          type="button"
          onClick={handleContinue}
          disabled={!checked || submitting}
          className="mt-6 w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "Continuing…" : "Continue to questionnaire"}
        </button>
      </main>
    </div>
  );
}
