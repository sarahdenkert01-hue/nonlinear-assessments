import { THEMES } from "@/features/assessments/data/themes";
import type { EvidenceSourceType } from "./types";

export interface ClinicalDomain {
  id: string;
  label: string;
  description: string;
  /** Source types expected for a complete domain picture (used for gap hints). */
  expectedSourceTypes: EvidenceSourceType[];
}

/** Stable clinical domains — broader than screener themes. Findings keep theme-level names. */
export const CLINICAL_DOMAINS: ClinicalDomain[] = [
  {
    id: "executive-function",
    label: "Executive Function",
    description: "Planning, initiation, task management, and cognitive organization.",
    expectedSourceTypes: ["FINDING", "CLINICIAN_INTERVIEW"],
  },
  {
    id: "attention-regulation",
    label: "Attention Regulation",
    description: "Sustained attention, distractibility, and consistency of focus.",
    expectedSourceTypes: ["FINDING", "CLINICIAN_INTERVIEW"],
  },
  {
    id: "emotional-regulation",
    label: "Emotional Regulation",
    description: "Emotional intensity, recovery, suppression, and flooding.",
    expectedSourceTypes: ["FINDING", "CLINICIAN_INTERVIEW"],
  },
  {
    id: "masking-adaptation",
    label: "Masking & Social Adaptation",
    description: "Camouflaging, compensation, and social effort to adapt.",
    expectedSourceTypes: ["FINDING", "CLINICIAN_INTERVIEW"],
  },
  {
    id: "burnout-collapse",
    label: "Burnout & Functional Collapse",
    description: "Burnout, shutdown, and impaired recovery.",
    expectedSourceTypes: ["FINDING", "CLINICIAN_INTERVIEW"],
  },
  {
    id: "sensory-processing",
    label: "Sensory Processing",
    description: "Sensory sensitivity, overload, and avoidance.",
    expectedSourceTypes: ["FINDING", "CLINICIAN_INTERVIEW"],
  },
  {
    id: "nervous-system-regulation",
    label: "Nervous System Regulation",
    description: "Hypervigilance, dysregulation, and stress response patterns.",
    expectedSourceTypes: ["FINDING", "CLINICIAN_INTERVIEW"],
  },
  {
    id: "social-communication",
    label: "Social Communication & Relational Processing",
    description: "Social analysis, processing exhaustion, and rejection sensitivity.",
    expectedSourceTypes: ["FINDING", "CLINICIAN_INTERVIEW"],
  },
  {
    id: "identity-self-concept",
    label: "Identity & Self-Concept",
    description: "Identity confusion, suppression, fragmentation, and shame.",
    expectedSourceTypes: ["FINDING", "CLINICIAN_INTERVIEW"],
  },
  {
    id: "trauma-overlap",
    label: "Trauma & Neurodivergence Overlap",
    description: "Trauma-adjacent patterns that may overlap with neurodivergent presentation.",
    expectedSourceTypes: ["FINDING", "CLINICIAN_INTERVIEW"],
  },
  {
    id: "relational-safety",
    label: "Relational Safety & Attachment",
    description: "Safety, trust, and attachment-related adaptations.",
    expectedSourceTypes: ["FINDING", "CLINICIAN_INTERVIEW"],
  },
  {
    id: "functional-impact",
    label: "Functional Impact",
    description: "Impact on daily life, work, relationships, and functional consistency.",
    expectedSourceTypes: ["FINDING", "CLINICIAN_INTERVIEW", "COLLATERAL"],
  },
  {
    id: "developmental-history",
    label: "Developmental History",
    description: "Lifespan and developmental evidence across childhood and adulthood.",
    expectedSourceTypes: ["CLINICIAN_INTERVIEW", "COLLATERAL"],
  },
  {
    id: "strengths-protective-factors",
    label: "Strengths & Protective Factors",
    description: "Strengths, resources, and compensatory strategies.",
    expectedSourceTypes: ["MANUAL_NOTE", "CLINICIAN_INTERVIEW"],
  },
];

const domainById = new Map(CLINICAL_DOMAINS.map((d) => [d.id, d]));

/** Primary theme → domain mapping (one domain per screener theme). */
const PRIMARY_THEME_TO_DOMAIN: Record<string, string> = {
  "executive-dysfunction": "executive-function",
  "task-paralysis": "executive-function",
  "cognitive-overload": "executive-function",
  "perfectionistic-compensation": "executive-function",
  "functional-inconsistency": "attention-regulation",
  "rejection-sensitivity": "social-communication",
  "emotional-dysregulation": "emotional-regulation",
  "emotional-flooding": "emotional-regulation",
  "emotional-suppression": "emotional-regulation",
  masking: "masking-adaptation",
  "masking-fatigue": "masking-adaptation",
  "chronic-overcompensation": "masking-adaptation",
  "social-hyperanalysis": "masking-adaptation",
  "neurodivergent-burnout": "burnout-collapse",
  "burnout-recovery": "burnout-collapse",
  "shutdown-collapse": "burnout-collapse",
  "sensory-dysregulation": "sensory-processing",
  "nervous-system-dysregulation": "nervous-system-regulation",
  "chronic-hypervigilance": "nervous-system-regulation",
  "social-processing-exhaustion": "social-communication",
  "identity-confusion": "identity-self-concept",
  "identity-suppression": "identity-self-concept",
  "identity-fragmentation": "identity-self-concept",
  "chronic-shame": "identity-self-concept",
  "trauma-overlap": "trauma-overlap",
  "relational-safety": "relational-safety",
};

/** Additional domains a theme may contribute evidence to (e.g. functional impact). */
const SECONDARY_THEME_TO_DOMAINS: Record<string, string[]> = {
  "functional-inconsistency": ["functional-impact"],
  "shutdown-collapse": ["functional-impact"],
  "burnout-recovery": ["functional-impact"],
  "neurodivergent-burnout": ["functional-impact"],
};

export function getDomainById(id: string): ClinicalDomain | undefined {
  return domainById.get(id);
}

export function getAllDomains(): ClinicalDomain[] {
  return CLINICAL_DOMAINS;
}

/** Resolve screener theme ids (Finding.code) to clinical domain ids. */
export function getDomainsForTheme(themeId: string): string[] {
  const primary = PRIMARY_THEME_TO_DOMAIN[themeId];
  const secondary = SECONDARY_THEME_TO_DOMAINS[themeId] ?? [];
  if (!primary) return [...secondary];
  return [primary, ...secondary.filter((id) => id !== primary)];
}

/** Every screener theme must map to at least one domain. */
export function validateThemeDomainCoverage(): string[] {
  const unmapped = THEMES.filter((t) => getDomainsForTheme(t.id).length === 0).map(
    (t) => t.id,
  );
  return unmapped;
}

const SOURCE_TYPE_LABELS: Record<EvidenceSourceType, string> = {
  CLIENT_SELF_REPORT: "Client self-report",
  CLINICIAN_INTERVIEW: "Clinician interview",
  CLINICIAN_OBSERVATION: "Clinician observation",
  COLLATERAL: "Collateral informant",
  STRUCTURED_MEASURE: "Structured measure",
  MANUAL_NOTE: "Clinician note",
  FINDING: "Confirmed finding",
};

export function sourceTypeLabel(source: EvidenceSourceType): string {
  return SOURCE_TYPE_LABELS[source];
}
