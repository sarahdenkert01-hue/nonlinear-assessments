"use client";

import { useMemo, useState } from "react";
import { AssessmentForm, buildSections, getChapterReflections } from "@/features/assessments";
import {
  INTAKE_COMPLETION_ARC_INTRO,
  INTAKE_COMPLETION_ARC_TITLE,
  INTAKE_COMPLETION_CLOSING,
  INTAKE_COMPLETION_COLLABORATION_BODY,
  INTAKE_COMPLETION_COLLABORATION_TITLE,
  INTAKE_COMPLETION_REFLECTIONS_NOTE,
} from "@/content/intake-completion-copy";
import {
  INTAKE_COMPLETION_HIDE_REVIEW_CTA,
  INTAKE_COMPLETION_HOPE,
  INTAKE_COMPLETION_NEXT_STEPS,
  INTAKE_COMPLETION_REVIEW_CTA,
  INTAKE_COMPLETION_REVIEW_SUBTITLE,
  INTAKE_COMPLETION_REVIEW_TITLE,
  INTAKE_COMPLETION_SUBTITLE,
  INTAKE_COMPLETION_TITLE,
} from "@/content/intake-experience";
import "@/features/assessments/components/assessment.css";
import type { AssessmentSessionRecord } from "@/lib/episodes";

export function IntakeCompletion({ session }: { session: AssessmentSessionRecord }) {
  const [showReview, setShowReview] = useState(false);
  const reflections = getChapterReflections(session.answers);
  const chapters = useMemo(() => buildSections(), []);

  return (
    <div className="assessment-root">
      <div className="assessment-shell">
        <div className="intake-completion">
          <header className="intake-completion-header">
            <h1 className="assessment-title">{INTAKE_COMPLETION_TITLE}</h1>
            <p className="assessment-subtitle">{INTAKE_COMPLETION_SUBTITLE}</p>
          </header>

          <section className="intake-completion-arc" aria-labelledby="completion-arc-title">
            <h2 id="completion-arc-title" className="intake-completion-section-title">
              {INTAKE_COMPLETION_ARC_TITLE}
            </h2>
            <p className="intake-completion-arc-intro">{INTAKE_COMPLETION_ARC_INTRO}</p>
            <ol className="intake-completion-arc-list">
              {chapters.map((chapter) => (
                <li key={chapter.title}>{chapter.title}</li>
              ))}
            </ol>
            {reflections.length > 0 && (
              <p className="intake-completion-reflections-note">
                {INTAKE_COMPLETION_REFLECTIONS_NOTE(reflections.length)}
              </p>
            )}
          </section>

          <section className="intake-completion-collaboration">
            <h2 className="intake-completion-section-title">
              {INTAKE_COMPLETION_COLLABORATION_TITLE}
            </h2>
            <p className="intake-completion-collaboration-body">
              {INTAKE_COMPLETION_COLLABORATION_BODY}
            </p>
            <ul className="intake-completion-steps">
              {INTAKE_COMPLETION_NEXT_STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </section>

          <p className="intake-completion-hope">{INTAKE_COMPLETION_HOPE}</p>
          <p className="intake-completion-closing">{INTAKE_COMPLETION_CLOSING}</p>

          {session.submittedAt && (
            <p className="intake-completion-meta">
              Shared {new Date(session.submittedAt).toLocaleString()}
            </p>
          )}

          <button
            type="button"
            className="assessment-btn assessment-btn--secondary intake-completion-review-btn"
            onClick={() => setShowReview((v) => !v)}
          >
            {showReview ? INTAKE_COMPLETION_HIDE_REVIEW_CTA : INTAKE_COMPLETION_REVIEW_CTA}
          </button>
        </div>

        {showReview && (
          <div className="intake-completion-review">
            {reflections.length > 0 && (
              <section className="intake-completion-reflections" aria-label="Your reflections">
                <h2 className="assessment-section-heading">Your reflections</h2>
                <ul className="assessment-reflections-list">
                  {reflections.map((entry) => (
                    <li key={entry.chapterIndex} className="assessment-reflections-item">
                      <p className="assessment-reflections-chapter">{entry.chapterTitle}</p>
                      <p className="assessment-reflections-text">{entry.text}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <AssessmentForm
              initialAnswers={session.answers}
              readOnly
              explorationFlow={false}
              title={INTAKE_COMPLETION_REVIEW_TITLE}
              subtitle={INTAKE_COMPLETION_REVIEW_SUBTITLE}
            />
          </div>
        )}
      </div>
    </div>
  );
}
