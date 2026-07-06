import { useEffect, useMemo, useRef, useState } from "react";
import {
  SUBMIT_CONFIRM_BACK,
  SUBMIT_CONFIRM_BODY,
  SUBMIT_CONFIRM_CTA,
  SUBMIT_CONFIRM_TITLE,
  questionInChapterLabel,
} from "@/content/intake-confirm";
import {
  getChapterReflectionPrompt,
  REFLECTION_CONTINUE_CTA,
  REFLECTION_OPTIONAL_HINT,
  REFLECTION_OPTIONAL_LABEL,
  REFLECTION_SKIP_CTA,
} from "@/content/intake-reflections";
import {
  CHAPTER_COMPLETE_CTA,
  CHAPTER_CONTINUE_CTA,
  CHAPTER_INTRO_CTA,
  CHAPTER_PREVIOUS_CTA,
  estimatedMinutesRemaining,
  getChapterContent,
  INTAKE_MINUTES_PER_CHAPTER,
} from "@/content/intake-chapters";
import { AGREEMENT_OPTIONS, FREQUENCY_OPTIONS, NOT_SURE_OPTION } from "../data/questions";
import { reflectionKey } from "../lib/reflections";
import { buildSections, countAnsweredQuestions } from "../lib/scoring";
import type { AssessmentAnswers, AssessmentQuestion, AssessmentSection } from "../types";
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
  /** Chapter intro + completion acknowledgments (client exploration flow). */
  explorationFlow?: boolean;
}

type SectionPhase = "intro" | "questions" | "reflection" | "complete" | "confirm";

function NotSureButton({
  value,
  onChange,
  disabled,
}: {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`assessment-scale-not-sure${value === NOT_SURE_OPTION ? " assessment-scale-not-sure--selected" : ""}`}
      onClick={() => onChange(NOT_SURE_OPTION)}
      aria-pressed={value === NOT_SURE_OPTION}
    >
      {NOT_SURE_OPTION}
    </button>
  );
}

function FrequencyScale({
  value,
  onChange,
  disabled,
  showNotSure = true,
}: {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  showNotSure?: boolean;
}) {
  return (
    <div className="assessment-scale-group">
      <div className="assessment-scale" role="group" aria-label="How often">
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
      {showNotSure && <NotSureButton value={value} onChange={onChange} disabled={disabled} />}
    </div>
  );
}

function AgreementScale({
  value,
  onChange,
  disabled,
  showNotSure = true,
}: {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  showNotSure?: boolean;
}) {
  return (
    <div className="assessment-scale-group">
      <div className="assessment-scale" role="group" aria-label="How much you agree">
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
      {showNotSure && <NotSureButton value={value} onChange={onChange} disabled={disabled} />}
    </div>
  );
}

function QuestionField({
  question,
  value,
  onChange,
  index,
  readOnly,
  focusMode = false,
  showNotSure = true,
}: {
  question: AssessmentQuestion;
  value?: string;
  onChange: (value: string) => void;
  index: number;
  readOnly?: boolean;
  focusMode?: boolean;
  showNotSure?: boolean;
}) {
  return (
    <div className={`assessment-question${focusMode ? " assessment-question--focus" : ""}`}>
      <p className="assessment-question-text">
        {!focusMode && <span className="assessment-question-index">{index + 1}.</span>}
        {question.text}
      </p>
      {question.format === "frequency" && (
        <FrequencyScale
          value={value}
          onChange={onChange}
          disabled={readOnly}
          showNotSure={showNotSure && !readOnly}
        />
      )}
      {question.format === "agreement" && (
        <AgreementScale
          value={value}
          onChange={onChange}
          disabled={readOnly}
          showNotSure={showNotSure && !readOnly}
        />
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

function countAllQuestions(sections: AssessmentSection[]): number {
  return sections.reduce((n, s) => n + s.questions.length, 0);
}

function sectionHasAnswers(section: AssessmentSection, answers: AssessmentAnswers): boolean {
  return section.questions.some((q) => (answers[q.id] ?? "").trim().length > 0);
}

function findResumeSectionIndex(
  sections: AssessmentSection[],
  answers: AssessmentAnswers,
): number {
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const allAnswered = section.questions.every((q) => (answers[q.id] ?? "").trim().length > 0);
    if (!allAnswered) return i;
  }
  return Math.max(sections.length - 1, 0);
}

function findFirstUnansweredQuestionIndex(
  section: AssessmentSection,
  answers: AssessmentAnswers,
): number {
  const idx = section.questions.findIndex((q) => !(answers[q.id] ?? "").trim());
  return idx === -1 ? Math.max(section.questions.length - 1, 0) : idx;
}

function initialQuestionIndex(
  sections: AssessmentSection[],
  answers: AssessmentAnswers,
  sectionIndex: number,
  useChapterFlow: boolean,
): number {
  if (!useChapterFlow) return 0;
  const section = sections[sectionIndex];
  if (!section) return 0;
  return findFirstUnansweredQuestionIndex(section, answers);
}

function initialSectionPhase(
  sections: AssessmentSection[],
  answers: AssessmentAnswers,
  sectionIndex: number,
  readOnly: boolean,
  useChapterFlow: boolean,
): SectionPhase {
  if (readOnly || !useChapterFlow) return "questions";
  const section = sections[sectionIndex];
  if (!section) return "intro";
  return sectionHasAnswers(section, answers) ? "questions" : "intro";
}

export function AssessmentForm({
  initialAnswers = {},
  onAnswersChange,
  onComplete,
  title = "Exploring your experience",
  subtitle = "Answer based on how you've felt over the past several months. There are no right or wrong answers.",
  readOnly = false,
  submitLabel = "Submit",
  explorationFlow = true,
}: AssessmentFormProps) {
  const sections = useMemo(() => buildSections(), []);
  const totalQuestions = useMemo(() => countAllQuestions(sections), [sections]);
  const useChapterFlow = !readOnly && explorationFlow;

  const [answers, setAnswers] = useState<AssessmentAnswers>(initialAnswers);
  const [sectionIndex, setSectionIndex] = useState(() =>
    useChapterFlow ? findResumeSectionIndex(sections, initialAnswers) : 0,
  );
  const [sectionPhase, setSectionPhase] = useState<SectionPhase>(() =>
    initialSectionPhase(sections, initialAnswers, sectionIndex, readOnly, useChapterFlow),
  );
  const [questionIndex, setQuestionIndex] = useState(() =>
    initialQuestionIndex(sections, initialAnswers, sectionIndex, useChapterFlow),
  );
  const skipAnswersNotify = useRef(true);

  useEffect(() => {
    if (useChapterFlow && typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [sectionIndex, sectionPhase, questionIndex, useChapterFlow]);

  useEffect(() => {
    if (skipAnswersNotify.current) {
      skipAnswersNotify.current = false;
      return;
    }
    onAnswersChange?.(answers);
  }, [answers, onAnswersChange]);

  const answeredCount = countAnsweredQuestions(answers);
  const answerProgress =
    totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const currentSection = sections[sectionIndex];
  const chapter = getChapterContent(sectionIndex);
  const minutesLeft = estimatedMinutesRemaining(sectionIndex, sections.length);
  const questionsInSection = currentSection?.questions.length ?? 0;
  const singleQuestionMode = useChapterFlow && sectionPhase === "questions";
  const currentQuestion =
    singleQuestionMode && currentSection
      ? currentSection.questions[questionIndex]
      : undefined;

  const completedChapters =
    sectionPhase === "complete" || sectionPhase === "confirm" ? sectionIndex + 1 : sectionIndex;

  const chapterProgress = useChapterFlow
    ? Math.round(
        ((sectionIndex +
          (sectionPhase === "confirm"
            ? 1
            : sectionPhase === "complete"
              ? 0.95
              : sectionPhase === "reflection"
                ? 0.8
                : sectionPhase === "questions" && questionsInSection > 0
                  ? 0.35 + (0.4 * (questionIndex + 1)) / questionsInSection
                  : 0)) /
          sections.length) *
          100,
      )
    : answerProgress;

  const setAnswer = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const setReflection = (chapterIndex: number, value: string) => {
    const key = reflectionKey(chapterIndex);
    setAnswers((prev) => {
      const next = { ...prev };
      if (value.trim()) {
        next[key] = value;
      } else {
        delete next[key];
      }
      return next;
    });
  };

  const goToSection = (index: number) => {
    setSectionIndex(index);
    if (!useChapterFlow) {
      setQuestionIndex(0);
      return;
    }
    const section = sections[index];
    if (section && sectionHasAnswers(section, answers)) {
      setSectionPhase("questions");
      setQuestionIndex(findFirstUnansweredQuestionIndex(section, answers));
    } else {
      setSectionPhase("intro");
      setQuestionIndex(0);
    }
  };

  const goNext = () => {
    if (!useChapterFlow) {
      if (sectionIndex < sections.length - 1) {
        setSectionIndex((i) => i + 1);
        return;
      }
      if (!readOnly) onComplete?.(answers);
      return;
    }

    if (sectionPhase === "intro") {
      setSectionPhase("questions");
      setQuestionIndex(0);
      return;
    }

    if (sectionPhase === "questions" && currentSection) {
      if (questionIndex < currentSection.questions.length - 1) {
        setQuestionIndex((i) => i + 1);
        return;
      }
      setSectionPhase("reflection");
      return;
    }

    if (sectionPhase === "reflection") {
      setSectionPhase("complete");
      return;
    }

    if (sectionPhase === "complete") {
      if (sectionIndex >= sections.length - 1) {
        setSectionPhase("confirm");
        return;
      }
      const nextIndex = sectionIndex + 1;
      setSectionIndex(nextIndex);
      const nextSection = sections[nextIndex];
      if (nextSection && sectionHasAnswers(nextSection, answers)) {
        setSectionPhase("questions");
        setQuestionIndex(findFirstUnansweredQuestionIndex(nextSection, answers));
      } else {
        setSectionPhase("intro");
        setQuestionIndex(0);
      }
      return;
    }

    if (sectionPhase === "confirm") {
      onComplete?.(answers);
    }
  };

  const skipReflection = () => {
    if (sectionPhase !== "reflection") return;
    setSectionPhase("complete");
  };

  const goPrev = () => {
    if (!useChapterFlow) {
      if (sectionIndex > 0) setSectionIndex((i) => i - 1);
      return;
    }

    if (sectionPhase === "confirm") {
      setSectionPhase("complete");
      return;
    }

    if (sectionPhase === "complete") {
      setSectionPhase("reflection");
      return;
    }

    if (sectionPhase === "reflection") {
      setSectionPhase("questions");
      if (currentSection) {
        setQuestionIndex(Math.max(currentSection.questions.length - 1, 0));
      }
      return;
    }

    if (sectionPhase === "questions") {
      if (questionIndex > 0) {
        setQuestionIndex((i) => i - 1);
        return;
      }
      if (sectionIndex > 0) {
        const prevIndex = sectionIndex - 1;
        const prevSection = sections[prevIndex];
        setSectionIndex(prevIndex);
        setSectionPhase("questions");
        setQuestionIndex(
          prevSection
            ? Math.max(prevSection.questions.length - 1, 0)
            : 0,
        );
      }
      return;
    }

    if (sectionPhase === "intro" && sectionIndex > 0) {
      const prevIndex = sectionIndex - 1;
      const prevSection = sections[prevIndex];
      setSectionIndex(prevIndex);
      setSectionPhase("questions");
      setQuestionIndex(
        prevSection ? Math.max(prevSection.questions.length - 1, 0) : 0,
      );
    }
  };

  const showPrevious =
    !readOnly &&
    (useChapterFlow
      ? sectionPhase === "complete" ||
        sectionPhase === "reflection" ||
        sectionPhase === "questions" ||
        (sectionPhase === "intro" && sectionIndex > 0)
      : sectionIndex > 0);

  const primaryLabel = (() => {
    if (readOnly) return submitLabel;
    if (!useChapterFlow) {
      return sectionIndex < sections.length - 1 ? CHAPTER_CONTINUE_CTA : submitLabel;
    }
    if (sectionPhase === "intro") return CHAPTER_INTRO_CTA;
    if (sectionPhase === "reflection") return REFLECTION_CONTINUE_CTA;
    if (sectionPhase === "confirm") return SUBMIT_CONFIRM_CTA;
    if (sectionPhase === "complete") {
      return sectionIndex >= sections.length - 1 ? submitLabel : CHAPTER_COMPLETE_CTA;
    }
    if (sectionPhase === "questions" && currentSection) {
      return questionIndex < currentSection.questions.length - 1
        ? CHAPTER_CONTINUE_CTA
        : CHAPTER_CONTINUE_CTA;
    }
    return CHAPTER_CONTINUE_CTA;
  })();

  const nextChapter = sections[sectionIndex + 1];

  return (
    <div className="assessment-root">
      <div className="assessment-shell">
        <header className="assessment-header">
          <h1 className="assessment-title">{title}</h1>
          <p className="assessment-subtitle">{subtitle}</p>

          {useChapterFlow ? (
            <div className="assessment-progress assessment-progress--exploration" aria-live="polite">
              <p className="assessment-progress-message">{chapter.progressMessage}</p>
              <p className="assessment-progress-meta">
                Chapter {sectionIndex + 1} of {sections.length} · About {minutesLeft} min left
                {singleQuestionMode && questionsInSection > 1 &&
                  ` · ${questionInChapterLabel(questionIndex + 1, questionsInSection)}`}
                {completedChapters > 0 &&
                  ` · ${completedChapters} chapter${completedChapters === 1 ? "" : "s"} complete`}
              </p>
              <div className="assessment-progress-bar" aria-hidden>
                <div
                  className="assessment-progress-fill"
                  style={{ width: `${chapterProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="assessment-progress" aria-live="polite">
              Chapter {sectionIndex + 1} of {sections.length} · {answeredCount} of {totalQuestions}{" "}
              answered
              <div className="assessment-progress-bar" aria-hidden>
                <div
                  className="assessment-progress-fill"
                  style={{ width: `${answerProgress}%` }}
                />
              </div>
            </div>
          )}
        </header>

        <nav className="assessment-section-nav" aria-label="Chapters">
          {sections.map((sec, i) => {
            const isComplete =
              i < sectionIndex ||
              (i === sectionIndex && (sectionPhase === "complete" || sectionPhase === "confirm"));
            const isActive = i === sectionIndex && sectionPhase !== "complete" && sectionPhase !== "confirm";
            return (
              <button
                key={sec.title}
                type="button"
                className={`assessment-section-pill${isActive ? " assessment-section-pill--active" : ""}${isComplete ? " assessment-section-pill--complete" : ""}`}
                onClick={() => !readOnly && goToSection(i)}
                disabled={readOnly && i !== sectionIndex}
                aria-current={isActive ? "step" : undefined}
              >
                {isComplete && <span className="assessment-section-pill-check" aria-hidden>✓</span>}
                {sec.title}
              </button>
            );
          })}
        </nav>

        <div
          className={`assessment-card${useChapterFlow && sectionPhase !== "questions" ? " assessment-card--interstitial" : ""}${singleQuestionMode ? " assessment-card--focus-question" : ""}`}
        >
          {currentSection && useChapterFlow && sectionPhase === "intro" && (
            <div className="assessment-chapter-intro">
              <p className="assessment-chapter-kicker">
                Chapter {sectionIndex + 1} of {sections.length}
              </p>
              <h2 className="assessment-chapter-title">{currentSection.title}</h2>
              <p className="assessment-chapter-intro-lead">{chapter.intro}</p>
              <p className="assessment-chapter-intro-desc">{currentSection.desc}</p>
              <p className="assessment-chapter-time">About {INTAKE_MINUTES_PER_CHAPTER} minutes</p>
            </div>
          )}

          {currentSection && useChapterFlow && sectionPhase === "reflection" && (
            <div className="assessment-chapter-reflection">
              <p className="assessment-chapter-kicker">{REFLECTION_OPTIONAL_LABEL}</p>
              <h2 className="assessment-chapter-reflection-prompt">
                {getChapterReflectionPrompt(sectionIndex)}
              </h2>
              <p className="assessment-chapter-reflection-hint">{REFLECTION_OPTIONAL_HINT}</p>
              <textarea
                className="assessment-textarea assessment-chapter-reflection-input"
                value={answers[reflectionKey(sectionIndex)] ?? ""}
                onChange={(e) => setReflection(sectionIndex, e.target.value)}
                placeholder="Share as much or as little as you'd like..."
                rows={4}
              />
            </div>
          )}

          {useChapterFlow && sectionPhase === "confirm" && (
            <div className="assessment-submit-confirm">
              <h2 className="assessment-chapter-title">{SUBMIT_CONFIRM_TITLE}</h2>
              <p className="assessment-submit-confirm-body">{SUBMIT_CONFIRM_BODY}</p>
            </div>
          )}

          {currentSection && useChapterFlow && sectionPhase === "complete" && (
            <div className="assessment-chapter-complete">
              <p className="assessment-chapter-complete-message">{chapter.completionMessage}</p>
              {nextChapter && (
                <p className="assessment-chapter-complete-next">
                  Next: <span>{nextChapter.title}</span>
                </p>
              )}
            </div>
          )}

          {currentSection && (!useChapterFlow || sectionPhase === "questions") && (
            <>
              {useChapterFlow ? (
                <div className="assessment-question-header">
                  <p className="assessment-chapter-kicker assessment-chapter-kicker--inline">
                    {currentSection.title}
                  </p>
                  {questionsInSection > 1 && (
                    <p className="assessment-question-progress">
                      {questionInChapterLabel(questionIndex + 1, questionsInSection)}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <h2 className="assessment-section-heading">{currentSection.title}</h2>
                  <p className="assessment-section-desc">{currentSection.desc}</p>
                </>
              )}

              {singleQuestionMode && currentQuestion ? (
                <QuestionField
                  key={currentQuestion.id}
                  question={currentQuestion}
                  value={answers[currentQuestion.id]}
                  onChange={(v) => setAnswer(currentQuestion.id, v)}
                  index={questionIndex}
                  readOnly={readOnly}
                  focusMode
                />
              ) : (
                currentSection.questions.map((q, qi) => (
                  <QuestionField
                    key={q.id}
                    question={q}
                    value={answers[q.id]}
                    onChange={(v) => setAnswer(q.id, v)}
                    index={qi}
                    readOnly={readOnly}
                  />
                ))
              )}
            </>
          )}

          {!readOnly && (
            <div className="assessment-actions">
              {showPrevious ? (
                <button
                  type="button"
                  className="assessment-btn assessment-btn--secondary"
                  onClick={goPrev}
                >
                  {CHAPTER_PREVIOUS_CTA}
                </button>
              ) : (
                <span />
              )}
              <div className="assessment-actions-primary">
                {useChapterFlow && sectionPhase === "confirm" && (
                  <button
                    type="button"
                    className="assessment-btn assessment-btn--ghost"
                    onClick={goPrev}
                  >
                    {SUBMIT_CONFIRM_BACK}
                  </button>
                )}
                {useChapterFlow && sectionPhase === "reflection" && (
                  <button
                    type="button"
                    className="assessment-btn assessment-btn--ghost"
                    onClick={skipReflection}
                  >
                    {REFLECTION_SKIP_CTA}
                  </button>
                )}
                <button
                  type="button"
                  className="assessment-btn assessment-btn--primary"
                  onClick={goNext}
                >
                  {primaryLabel}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
