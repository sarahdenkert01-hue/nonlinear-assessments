import type {
  AssessmentAnswers,
  ClinicianOverrides,
  ResolvedTheme,
} from "@/features/assessments/types";
import type { ThemeReportContext } from "./build-context";
import type { DomainReportSection } from "./domain-sections";

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
  /**
   * Clinician-approved findings (ACCEPTED/EDITED) mapped to report themes.
   * Supporting context for generative sections; legacy theme body when no domains.
   */
  findingThemes?: ThemeReportContext[];
  /**
   * Clinician-authored domain narratives. When present, these are the report body
   * source of truth and are never rewritten by the LLM.
   */
  domainSections?: DomainReportSection[];
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
