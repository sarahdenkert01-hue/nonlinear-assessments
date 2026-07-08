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
  REFLECTION_KICKER,
  REFLECTION_OPTIONAL_HINT,
  REFLECTION_SKIP_CTA,
} from "@/content/intake-reflections";
import {
  CHAPTER_COMPLETE_ACK,
  CHAPTER_CONTINUE_CTA,
  CHAPTER_INTRO_CTA,
  CHAPTER_PREVIOUS_CTA,
  estimatedMinutesRemaining,
  getChapterContent,
  INTAKE_MINUTES_PER_CHAPTER,
} from "@/content/intake-chapters";
import { getMicroValidation } from "@/content/intake-validations";
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

type SectionPhase = "intro" | "questions" | "reflection" | "confirm";

type ChapterTransition = {
  completedIndex: number;
  phase: "exiting" | "entering";
} | null;

const CHAPTER_TRANSITION_ADVANCE_MS = 420;
const CHAPTER_TRANSITION_TOTAL_MS = 960;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

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
  const [chapterTransition, setChapterTransition] = useState<ChapterTransition>(null);
  const skipAnswersNotify = useRef(true);
  const transitionTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTransitionTimers = () => {
    transitionTimersRef.current.forEach(clearTimeout);
    transitionTimersRef.current = [];
  };

  useEffect(() => {
    return () => clearTransitionTimers();
  }, []);

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

  const chapterProgress = useChapterFlow
    ? Math.round(
        ((sectionIndex +
          (sectionPhase === "confirm"
            ? 1
            : sectionPhase === "reflection"
              ? 0.85
              : sectionPhase === "questions" && questionsInSection > 0
                ? 0.2 + (0.55 * (questionIndex + 1)) / questionsInSection
                : 0)) /
          sections.length) *
          100,
      )
    : answerProgress;

  const microValidation =
    useChapterFlow && sectionPhase === "questions"
      ? getMicroValidation(sectionIndex, questionIndex, sections)
      : null;

  const displayChapterProgress =
    useChapterFlow && chapterTransition?.phase === "exiting"
      ? Math.round(((chapterTransition.completedIndex + 1) / sections.length) * 100)
      : chapterProgress;

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

  const advanceFromChapterEnd = () => {
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
  };

  const beginChapterAdvance = () => {
    if (prefersReducedMotion()) {
      advanceFromChapterEnd();
      return;
    }

    const completedIndex = sectionIndex;
    clearTransitionTimers();
    setChapterTransition({ completedIndex, phase: "exiting" });

    const advanceTimer = setTimeout(() => {
      advanceFromChapterEnd();
      setChapterTransition({ completedIndex, phase: "entering" });
    }, CHAPTER_TRANSITION_ADVANCE_MS);
    transitionTimersRef.current.push(advanceTimer);

    const endTimer = setTimeout(() => {
      setChapterTransition(null);
    }, CHAPTER_TRANSITION_TOTAL_MS);
    transitionTimersRef.current.push(endTimer);
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
    if (chapterTransition) return;

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
      beginChapterAdvance();
      return;
    }

    if (sectionPhase === "confirm") {
      onComplete?.(answers);
    }
  };

  const skipReflection = () => {
    if (sectionPhase !== "reflection" || chapterTransition) return;
    beginChapterAdvance();
  };

  const goPrev = () => {
    if (chapterTransition) return;

    if (!useChapterFlow) {
      if (sectionIndex > 0) setSectionIndex((i) => i - 1);
      return;
    }

    if (sectionPhase === "confirm") {
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
      ? sectionPhase === "reflection" ||
        sectionPhase === "questions" ||
        sectionPhase === "confirm" ||
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
    if (sectionPhase === "questions" && currentSection) {
      return questionIndex < currentSection.questions.length - 1
        ? CHAPTER_CONTINUE_CTA
        : CHAPTER_CONTINUE_CTA;
    }
    return CHAPTER_CONTINUE_CTA;
  })();

  const isQuestionFocus =
    useChapterFlow && sectionPhase === "questions" && !chapterTransition;
  const isTransitioning = chapterTransition !== null;
  const cardContentKey = `${sectionIndex}-${sectionPhase}-${questionIndex}`;
  const cardBodyClass = [
    "assessment-card-body",
    chapterTransition?.phase === "exiting" ? "assessment-card-body--exit" : "",
    chapterTransition?.phase === "entering" ? "assessment-card-body--enter" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="assessment-root">
      <div className="assessment-shell">
        {useChapterFlow ? (
          <header
            className={`assessment-header assessment-header--journey${isQuestionFocus ? " assessment-header--compact" : ""}`}
          >
            <div className="assessment-progress assessment-progress--exploration" aria-live="polite">
              {chapterTransition && (
                <p className="assessment-progress-complete" role="status">
                  <span className="assessment-progress-complete-icon" aria-hidden>
                    <svg viewBox="0 0 20 20" width="15" height="15" fill="none">
                      <circle cx="10" cy="10" r="8.25" stroke="currentColor" strokeWidth="1.5" />
                      <path
                        d="M6.5 10.2 8.8 12.5 13.5 7.8"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  {CHAPTER_COMPLETE_ACK}
                </p>
              )}
              {!isQuestionFocus && (
                <p key={chapter.progressMessage} className="assessment-progress-message">
                  {chapter.progressMessage}
                </p>
              )}
              <p className="assessment-progress-meta">
                {isQuestionFocus && questionsInSection > 1
                  ? questionInChapterLabel(questionIndex + 1, questionsInSection)
                  : `Chapter ${sectionIndex + 1} of ${sections.length} · About ${minutesLeft} min left`}
              </p>
              <div
                className="assessment-progress-bar"
                role="progressbar"
                aria-valuenow={displayChapterProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Assessment progress"
              >
                <div
                  className={`assessment-progress-fill${isTransitioning ? " assessment-progress-fill--transitioning" : ""}`}
                  style={{ width: `${displayChapterProgress}%` }}
                />
              </div>
            </div>
          </header>
        ) : (
          <header className="assessment-header">
            <h1 className="assessment-title">{title}</h1>
            <p className="assessment-subtitle">{subtitle}</p>
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
          </header>
        )}

        {!isQuestionFocus && (
          <nav
            className={`assessment-section-nav${isTransitioning ? " assessment-section-nav--transitioning" : ""}`}
            aria-label="Chapters"
          >
            {sections.map((sec, i) => {
              const isCompleting =
                chapterTransition?.phase === "exiting" &&
                i === chapterTransition.completedIndex;
              const isComplete =
                i < sectionIndex ||
                isCompleting ||
                (chapterTransition?.phase === "entering" &&
                  i === chapterTransition.completedIndex) ||
                (i === sectionIndex &&
                  sectionPhase === "reflection" &&
                  !chapterTransition) ||
                (i === sectionIndex && sectionPhase === "confirm");
              const isIncoming =
                chapterTransition?.phase === "entering" && i === sectionIndex;
              const isActive =
                i === sectionIndex && sectionPhase !== "confirm" && !isIncoming;
              return (
                <button
                  key={sec.title}
                  type="button"
                  className={`assessment-section-pill${isActive ? " assessment-section-pill--active" : ""}${isComplete ? " assessment-section-pill--complete" : ""}${isCompleting ? " assessment-section-pill--completing" : ""}${isIncoming ? " assessment-section-pill--incoming" : ""}`}
                  onClick={() => !readOnly && !isTransitioning && goToSection(i)}
                  disabled={(readOnly && i !== sectionIndex) || isTransitioning}
                  aria-current={isActive ? "step" : undefined}
                  aria-label={
                    isComplete ? `${sec.title}, completed` : sec.title
                  }
                >
                  {(isComplete || isCompleting) && (
                    <span
                      className={`assessment-section-pill-check${isCompleting ? " assessment-section-pill-check--completing" : ""}`}
                      aria-hidden
                    >
                      ✓
                    </span>
                  )}
                  <span className="assessment-section-pill-label">{sec.title}</span>
                </button>
              );
            })}
          </nav>
        )}

        <div
          className={`assessment-card${useChapterFlow && sectionPhase !== "questions" ? " assessment-card--interstitial" : ""}${singleQuestionMode ? " assessment-card--focus-question" : ""}${isTransitioning ? " assessment-card--transitioning" : ""}`}
        >
          <div key={cardContentKey} className={cardBodyClass}>
          {currentSection && useChapterFlow && sectionPhase === "intro" && (
            <div className="assessment-chapter-intro">
              <p className="assessment-chapter-kicker">
                Chapter {sectionIndex + 1} of {sections.length}
              </p>
              {sectionIndex > 0 && chapter.bridgeFromPrevious && (
                <p className="assessment-chapter-bridge">{chapter.bridgeFromPrevious}</p>
              )}
              <h2 className="assessment-chapter-title">{currentSection.title}</h2>
              <p className="assessment-chapter-intro-lead">{chapter.intro}</p>
              <p className="assessment-chapter-intro-desc">{chapter.whatToExpect}</p>
              <p className="assessment-chapter-time">About {INTAKE_MINUTES_PER_CHAPTER} minutes</p>
            </div>
          )}

          {currentSection && useChapterFlow && sectionPhase === "reflection" && (
            <div className="assessment-chapter-reflection">
              <p className="assessment-chapter-kicker">{REFLECTION_KICKER}</p>
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

          {currentSection && (!useChapterFlow || sectionPhase === "questions") && (
            <>
              {!useChapterFlow && (
                <>
                  <h2 className="assessment-section-heading">{currentSection.title}</h2>
                  <p className="assessment-section-desc">{currentSection.desc}</p>
                </>
              )}

              {microValidation && (
                <p className="assessment-micro-validation">{microValidation}</p>
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
                  disabled={isTransitioning}
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
                    disabled={isTransitioning}
                  >
                    {REFLECTION_SKIP_CTA}
                  </button>
                )}
                <button
                  type="button"
                  className={`assessment-btn assessment-btn--primary${isTransitioning ? " assessment-btn--advancing" : ""}`}
                  onClick={goNext}
                  disabled={isTransitioning}
                  aria-busy={isTransitioning}
                >
                  {primaryLabel}
                </button>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
