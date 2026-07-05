import type { ClinicalFormulationDraft, GroupedAssessmentOpportunities } from "./types";

export const EMPTY_FORMULATION: ClinicalFormulationDraft = {
  coreUnderstanding: null,
  functionalImpact: null,
  strengthsAdaptiveStrategies: null,
  remainingUncertainty: null,
  clinicalConsiderations: null,
};

export function parseClinicalFormulationDraft(value: unknown): ClinicalFormulationDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...EMPTY_FORMULATION };
  }
  const row = value as Record<string, unknown>;
  const str = (key: keyof ClinicalFormulationDraft) => {
    const v = row[key];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  return {
    coreUnderstanding: str("coreUnderstanding"),
    functionalImpact: str("functionalImpact"),
    strengthsAdaptiveStrategies: str("strengthsAdaptiveStrategies"),
    remainingUncertainty: str("remainingUncertainty"),
    clinicalConsiderations: str("clinicalConsiderations"),
  };
}

export function resolveClinicalFormulationDraft(
  clinicalFormulationDraft: unknown,
  clinicalNotes: string | null,
): ClinicalFormulationDraft {
  const fromJson = parseClinicalFormulationDraft(clinicalFormulationDraft);
  if (fromJson.clinicalConsiderations?.trim()) return fromJson;
  if (clinicalNotes?.trim()) {
    return { ...fromJson, clinicalConsiderations: clinicalNotes.trim() };
  }
  return fromJson;
}

export function hasFormulationStarted(draft: ClinicalFormulationDraft): boolean {
  return Object.values(draft).some((v) => Boolean(v?.trim()));
}

export function seedCoreFromSynthesis(
  draft: ClinicalFormulationDraft,
  synthesis: string | null,
): ClinicalFormulationDraft {
  const text = synthesis?.trim();
  if (!text) return draft;
  return { ...draft, coreUnderstanding: text };
}

export function pullUncertaintyFromOpportunities(
  draft: ClinicalFormulationDraft,
  groups: GroupedAssessmentOpportunities[],
): ClinicalFormulationDraft {
  if (groups.length === 0) return draft;
  const lines: string[] = [
    "Areas where additional information may strengthen confidence in this formulation:",
    "",
  ];
  for (const group of groups) {
    lines.push(`${group.label}:`);
    for (const item of group.items) {
      lines.push(`• ${item}`);
    }
    lines.push("");
  }
  return { ...draft, remainingUncertainty: lines.join("\n").trim() };
}

export function mergeFormulationDraft(
  current: ClinicalFormulationDraft,
  patch: Partial<ClinicalFormulationDraft>,
): ClinicalFormulationDraft {
  return {
    coreUnderstanding:
      patch.coreUnderstanding !== undefined
        ? patch.coreUnderstanding
        : current.coreUnderstanding,
    functionalImpact:
      patch.functionalImpact !== undefined ? patch.functionalImpact : current.functionalImpact,
    strengthsAdaptiveStrategies:
      patch.strengthsAdaptiveStrategies !== undefined
        ? patch.strengthsAdaptiveStrategies
        : current.strengthsAdaptiveStrategies,
    remainingUncertainty:
      patch.remainingUncertainty !== undefined
        ? patch.remainingUncertainty
        : current.remainingUncertainty,
    clinicalConsiderations:
      patch.clinicalConsiderations !== undefined
        ? patch.clinicalConsiderations
        : current.clinicalConsiderations,
  };
}
