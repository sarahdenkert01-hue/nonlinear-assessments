import type { AssessmentAnswers } from "@/features/assessments";

export type ModuleStatus = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "COMPLETED";

/** One client-facing module within an episode, for the journey UI and APIs. */
export interface ClientModuleRecord {
  id: string;
  moduleKey: string;
  moduleVersion: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  required: boolean;
  status: ModuleStatus;
  /** Screener answers or structured exploration payload. */
  data: AssessmentAnswers | Record<string, unknown>;
  submittedAt: string | null;
  displayOrder: number;
}

/** Episode-level view for the token-authorized client journey. */
export interface ClientAssessmentEpisode {
  id: string;
  status: string;
  clientName: string | null;
  consentAcceptedAt: string | null;
  token: string;
  tokenExpiresAt: string | null;
  revokedAt: string | null;
  modules: ClientModuleRecord[];
  /** True when every required assigned module is SUBMITTED or COMPLETED. */
  allRequiredSubmitted: boolean;
}

export interface LifeMapEntry {
  id: string;
  lifeStage: string;
  title: string;
  description: string;
  supportive: string;
  difficult: string;
  adapted: string;
  affectsNow: string;
  tags: string[];
  /** Lower sorts earlier. */
  sortOrder: number;
}

export interface LifeMapData {
  entries: LifeMapEntry[];
}

export type GuidedReflectionSectionKey =
  | "patterns"
  | "difficult-to-explain"
  | "adaptations"
  | "what-others-may-not-see"
  | "hopes";

export type GuidedReflectionData = Partial<Record<GuidedReflectionSectionKey, string>>;

export interface ExplorationReportContext {
  developmentalLifeMap?: {
    entries: LifeMapEntry[];
  };
  guidedReflection?: {
    sections: Record<string, string>;
  };
}
