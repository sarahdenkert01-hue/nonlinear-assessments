"use client";

import { useState } from "react";
import {
  AssessmentForm,
  AssessmentReview,
  type AssessmentAnswers,
} from "@/features/assessments";

type PreviewStep = "form" | "review";

export function AssessmentPreview() {
  const [step, setStep] = useState<PreviewStep>("form");
  const [answers, setAnswers] = useState<AssessmentAnswers>({});

  if (step === "review") {
    return (
      <div>
        <div className="border-b border-gray-200 bg-white px-6 py-3">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Dev preview — clinician review
            </span>
            <button
              type="button"
              onClick={() => setStep("form")}
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              ← Back to form
            </button>
          </div>
        </div>
        <AssessmentReview answers={answers} clientName="Preview client" />
      </div>
    );
  }

  return (
    <div>
      <div className="border-b border-gray-200 bg-white px-6 py-3">
        <p className="mx-auto max-w-2xl text-xs font-medium uppercase tracking-wide text-gray-400">
          Dev preview — client intake
        </p>
      </div>
      <AssessmentForm
        initialAnswers={answers}
        onComplete={(completed) => {
          setAnswers(completed);
          setStep("review");
        }}
      />
    </div>
  );
}
