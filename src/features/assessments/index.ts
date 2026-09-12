export * from "./types";
export { THEMES, getThemeById } from "./data/themes";
export {
  QUESTIONS,
  FREQUENCY_OPTIONS,
  AGREEMENT_OPTIONS,
  NOT_SURE_OPTION,
} from "./data/questions";
export {
  buildSections,
  computeThemeScores,
  resolveThemesWithOverrides,
  getIncludedThemes,
  isQuestionTriggered,
  getTriggeredQuestionsForTheme,
  countAnsweredQuestions,
  getScorableQuestions,
} from "./lib/scoring";
export {
  reflectionKey,
  isReflectionKey,
  getChapterReflections,
} from "./lib/reflections";
export type { ChapterReflection } from "./lib/reflections";
export {
  resolveQ62AcquiredEfContext,
  resolveQ62AcquiredEfContextFromAnswers,
  q62StrengthVerb,
  q62ThemeIds,
} from "./lib/q62-context";
export type {
  Q62AcquiredEfContext,
  Q62EndorsementStrength,
} from "./lib/q62-context";
export {
  requestSessionReport,
  requestDevPreviewReport,
} from "./lib/report-api";
export { AssessmentForm } from "./components/AssessmentForm";
export type { AssessmentFormProps } from "./components/AssessmentForm";
export { AssessmentReview } from "./components/AssessmentReview";
export type { AssessmentReviewProps } from "./components/AssessmentReview";
export { ReportPanel } from "./components/ReportPanel";
export type { ReportPanelProps } from "./components/ReportPanel";
