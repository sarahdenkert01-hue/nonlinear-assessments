export type ThemeCategory = "Autism" | "ADHD" | "Both";

export type ThemeSensitivity = "high" | "convergence";

export type TriggerMode = "single" | "2of3";

export interface Theme {
  id: string;
  label: string;
  category: ThemeCategory;
  sensitivity: ThemeSensitivity;
  triggerMode: TriggerMode;
}

export type QuestionFormat = "frequency" | "agreement" | "open";

export type QuestionWeight = "primary" | "contributing" | "context";

export interface QuestionFlag {
  frequency?: string[];
  agreement?: string[];
}

export interface AssessmentQuestion {
  id: string;
  text: string;
  format: QuestionFormat;
  themes: string[];
  weight: QuestionWeight;
  flag?: QuestionFlag;
}

export interface SectionMarker {
  section: string;
  sectionDesc: string;
}

export type QuestionItem = SectionMarker | AssessmentQuestion;

export function isSectionMarker(item: QuestionItem): item is SectionMarker {
  return "section" in item;
}

export function isAssessmentQuestion(item: QuestionItem): item is AssessmentQuestion {
  return "id" in item;
}

export type AssessmentAnswers = Record<string, string>;

export interface ThemeWeights {
  primary: number;
  contributing: number;
  total: number;
}

export interface ThemeScore extends Theme {
  hits: number;
  total: number;
  flagged: boolean;
  weights: ThemeWeights;
}

/** Clinician override per theme: force include, force exclude, or use algorithm. */
export type ClinicianThemeOverride = "include" | "exclude" | null;

export type ClinicianOverrides = Record<string, ClinicianThemeOverride>;

export interface ResolvedTheme extends ThemeScore {
  /** Whether this theme appears in the final clinician-facing list. */
  included: boolean;
  /** Source of inclusion decision. */
  source: "algorithm" | "clinician-include" | "clinician-exclude";
}

export interface AssessmentSection {
  title: string;
  desc: string;
  questions: AssessmentQuestion[];
}

export interface AssessmentReportInput {
  answers: AssessmentAnswers;
  resolvedThemes: ResolvedTheme[];
  clinicianNotes?: string;
}

export type ReportSource = "template" | "gemini" | "anthropic";

export interface AssessmentReportResult {
  draft: string;
  source: ReportSource;
  generatedAt: string;
  fallbackReason?: string;
}
