import { useEffect, useMemo, useRef, useState } from "react";
import { AGREEMENT_OPTIONS, FREQUENCY_OPTIONS } from "../data/questions";
import { buildSections, countAnsweredQuestions } from "../lib/scoring";
import type { AssessmentAnswers, AssessmentQuestion } from "../types";
import "./assessment.css";

export interface AssessmentFormProps {
  /** Initial answers (e.g. resumed intake). */
  initialAnswers?: AssessmentAnswers;
  /** Called when answers change (e.g. for auto-save). */
  onAnswersChange?: (answers: AssessmentAnswers) => void;
  /** Called when the client completes the final section. */
  onComplete?: (answers: AssessmentAnswers) => void;
  /** Optional title shown above the form. */
  title?: string;
  subtitle?: string;
  /** Disable editing after submit. */
  readOnly?: boolean;
  submitLabel?: string;
}

function FrequencyScale({
  value,
  onChange,
  disabled,
}: {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="assessment-scale" role="group">
      {FREQUENCY_OPTIONS.map((opt) => (
        <button
          key={opt}
          type="button"
          disabled={disabled}
          className={`assessment-scale-option${value === opt ? " assessment-scale-option--selected" : ""}`}
          onClick={() => onChange(opt)}
          aria-pressed={value === opt}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function AgreementScale({
  value,
  onChange,
  disabled,
}: {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="assessment-scale" role="group">
      {AGREEMENT_OPTIONS.map((opt) => (
        <button
          key={opt}
          type="button"
          disabled={disabled}
          className={`assessment-scale-option${value === opt ? " assessment-scale-option--selected" : ""}`}
          onClick={() => onChange(opt)}
          aria-pressed={value === opt}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function QuestionField({
  question,
  value,
  onChange,
  index,
  readOnly,
}: {
  question: AssessmentQuestion;
  value?: string;
  onChange: (value: string) => void;
  index: number;
  readOnly?: boolean;
}) {
  return (
    <div className="assessment-question">
      <p className="assessment-question-text">
        <span style={{ color: "#d1d5db", marginRight: "0.5rem", fontSize: "0.8125rem" }}>
          {index + 1}.
        </span>
        {question.text}
      </p>
      {question.format === "frequency" && (
        <FrequencyScale value={value} onChange={onChange} disabled={readOnly} />
      )}
      {question.format === "agreement" && (
        <AgreementScale value={value} onChange={onChange} disabled={readOnly} />
      )}
      {question.format === "open" && (
        <textarea
          className="assessment-textarea"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Share as much or as little as you'd like..."
          rows={4}
          readOnly={readOnly}
          disabled={readOnly}
        />
      )}
    </div>
  );
}

function countAllQuestions(
  sections: ReturnType<typeof buildSections>,
): number {
  return sections.reduce((n, s) => n + s.questions.length, 0);
}

export function AssessmentForm({
  initialAnswers = {},
  onAnswersChange,
  onComplete,
  title = "Clinical intake questionnaire",
  subtitle = "Please answer based on how you've felt over the past several months.",
  readOnly = false,
  submitLabel = "Submit",
}: AssessmentFormProps) {
  const sections = useMemo(() => buildSections(), []);
  const totalQuestions = useMemo(
    () => countAllQuestions(sections),
    [sections],
  );

  const [answers, setAnswers] = useState<AssessmentAnswers>(initialAnswers);
  const [sectionIndex, setSectionIndex] = useState(0);
  const skipAnswersNotify = useRef(true);

  useEffect(() => {
    if (skipAnswersNotify.current) {
      skipAnswersNotify.current = false;
      return;
    }
    onAnswersChange?.(answers);
  }, [answers, onAnswersChange]);

  const answeredCount = countAnsweredQuestions(answers);
  const progress =
    totalQuestions > 0
      ? Math.round((answeredCount / totalQuestions) * 100)
      : 0;

  const currentSection = sections[sectionIndex];

  const setAnswer = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const goNext = () => {
    if (sectionIndex < sections.length - 1) {
      setSectionIndex((i) => i + 1);
      return;
    }
    if (!readOnly) onComplete?.(answers);
  };

  const goPrev = () => {
    if (sectionIndex > 0) setSectionIndex((i) => i - 1);
  };

  return (
    <div className="assessment-root">
      <div className="assessment-shell">
        <header className="assessment-header">
          <h1 className="assessment-title">{title}</h1>
          <p className="assessment-subtitle">{subtitle}</p>
          <div className="assessment-progress" aria-live="polite">
            Section {sectionIndex + 1} of {sections.length} · {answeredCount} of{" "}
            {totalQuestions} answered
            <div className="assessment-progress-bar" aria-hidden>
              <div
                className="assessment-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </header>

        <nav className="assessment-section-nav" aria-label="Sections">
          {sections.map((sec, i) => (
            <button
              key={sec.title}
              type="button"
              className={`assessment-section-pill${i === sectionIndex ? " assessment-section-pill--active" : ""}`}
              onClick={() => !readOnly && setSectionIndex(i)}
              disabled={readOnly && i !== sectionIndex}
            >
              {sec.title}
            </button>
          ))}
        </nav>

        <div className="assessment-card">
          {currentSection && (
            <>
              <h2 className="assessment-section-heading">{currentSection.title}</h2>
              <p className="assessment-section-desc">{currentSection.desc}</p>

              {currentSection.questions.map((q, qi) => (
                <QuestionField
                  key={q.id}
                  question={q}
                  value={answers[q.id]}
                  onChange={(v) => setAnswer(q.id, v)}
                  index={qi}
                  readOnly={readOnly}
                />
              ))}
            </>
          )}

          <div className="assessment-actions">
            {sectionIndex > 0 ? (
              <button
                type="button"
                className="assessment-btn assessment-btn--secondary"
                onClick={goPrev}
              >
                Previous
              </button>
            ) : (
              <span />
            )}
            {!readOnly && (
              <button
                type="button"
                className="assessment-btn assessment-btn--primary"
                onClick={goNext}
              >
                {sectionIndex < sections.length - 1 ? "Continue" : submitLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
