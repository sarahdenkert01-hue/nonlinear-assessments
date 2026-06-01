"use client";

import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
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
    <div className="min-h-screen bg-[var(--background)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[var(--accent-soft)] to-transparent" />
      <main className="relative mx-auto max-w-lg px-6 py-12">
        <BrandLogo size={44} showWordmark className="mb-6" href={null} />
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
          Before you begin
        </p>
        <h1 className="ui-page-title mt-2">{INTAKE_CONSENT_TITLE}</h1>
        {session.clientName && (
          <p className="ui-page-lead">Questionnaire for {session.clientName}</p>
        )}
        <div className="ui-card mt-8 space-y-6 p-6">
          {INTAKE_CONSENT_SECTIONS.map((section) => (
            <div key={section.heading}>
              <h2 className="text-sm font-semibold text-slate-900">{section.heading}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{section.body}</p>
            </div>
          ))}
        </div>
        <label className="mt-8 flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--border)] bg-white p-4">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[var(--accent)] focus:ring-[var(--accent)]"
          />
          <span className="text-sm leading-relaxed text-slate-700">
            {INTAKE_CONSENT_CHECKBOX_LABEL}
          </span>
        </label>
        {error && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={handleContinue}
          disabled={!checked || submitting}
          className="ui-btn ui-btn-primary mt-6 w-full py-3"
        >
          {submitting ? "Continuing…" : "Continue to questionnaire"}
        </button>
      </main>
    </div>
  );
}
