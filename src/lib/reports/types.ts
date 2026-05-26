import type {
  AssessmentAnswers,
  ClinicianOverrides,
  ResolvedTheme,
} from "@/features/assessments/types";

export type LlmProvider = "gemini" | "anthropic";

export type ReportSource = "template" | LlmProvider;

export type ReportProfile = "brief" | "standard" | "detailed";

export interface ReportGenerationInput {
  clientName?: string;
  answers: AssessmentAnswers;
  resolvedThemes: ResolvedTheme[];
  overrides: ClinicianOverrides;
  clinicianNotes?: string;
  /** Shorter or longer narrative depth for LLM drafts. */
  profile?: ReportProfile;
  /** When set, LLM should rewrite summary/next-steps only and keep theme blocks stable. */
  narrativeOnly?: boolean;
  existingDraft?: string;
}

export interface GeneratedReport {
  draft: string;
  source: ReportSource;
  generatedAt: string;
  /** Set when LLM was configured but failed; narrative template was used instead. */
  fallbackReason?: string;
}

export interface LlmReportOptions {
  profile?: ReportProfile;
  narrativeOnly?: boolean;
  existingDraft?: string;
}
