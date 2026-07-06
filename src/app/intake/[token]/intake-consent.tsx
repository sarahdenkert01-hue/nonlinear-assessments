"use client";

import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import {
  INTAKE_BEGIN_CTA,
  INTAKE_BEGIN_CTA_LOADING,
  INTAKE_CONSENT_CHECKBOX_LABEL,
  INTAKE_EXPECTATIONS,
  INTAKE_LEGAL_DETAILS_SUMMARY,
  INTAKE_LEGAL_SECTIONS,
  INTAKE_WELCOME_EYEBROW,
  INTAKE_WELCOME_INTRO,
  INTAKE_WELCOME_TITLE,
  intakeWelcomeLead,
} from "@/content/intake-consent";
import "@/features/assessments/components/assessment.css";
import type { AssessmentSessionRecord } from "@/lib/episodes";

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
    <div className="assessment-root intake-welcome">
      <div className="assessment-shell">
        <BrandLogo size={44} showWordmark className="intake-welcome-logo" href={null} />

        <header className="intake-welcome-header">
          <p className="intake-welcome-eyebrow">{INTAKE_WELCOME_EYEBROW}</p>
          <h1 className="assessment-title">{INTAKE_WELCOME_TITLE}</h1>
          <p className="intake-welcome-lead">{intakeWelcomeLead(session.clientName)}</p>
          <p className="intake-welcome-intro">{INTAKE_WELCOME_INTRO}</p>
        </header>

        <section className="intake-welcome-expectations" aria-label="What to expect">
          {INTAKE_EXPECTATIONS.map((item) => (
            <div key={item.title} className="intake-welcome-expectation">
              <h2 className="intake-welcome-expectation-title">{item.title}</h2>
              <p className="intake-welcome-expectation-body">{item.body}</p>
            </div>
          ))}
        </section>

        <details className="intake-welcome-legal">
          <summary>{INTAKE_LEGAL_DETAILS_SUMMARY}</summary>
          <div className="intake-welcome-legal-body">
            {INTAKE_LEGAL_SECTIONS.map((section) => (
              <div key={section.heading} className="intake-welcome-legal-section">
                <h3 className="intake-welcome-legal-heading">{section.heading}</h3>
                <p className="intake-welcome-legal-text">{section.body}</p>
              </div>
            ))}
          </div>
        </details>

        <label className="intake-welcome-consent">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="intake-welcome-consent-input"
          />
          <span className="intake-welcome-consent-label">{INTAKE_CONSENT_CHECKBOX_LABEL}</span>
        </label>

        {error && <p className="intake-welcome-error">{error}</p>}

        <button
          type="button"
          onClick={handleContinue}
          disabled={!checked || submitting}
          className="assessment-btn assessment-btn--primary intake-welcome-cta"
        >
          {submitting ? INTAKE_BEGIN_CTA_LOADING : INTAKE_BEGIN_CTA}
        </button>
      </div>
    </div>
  );
}
