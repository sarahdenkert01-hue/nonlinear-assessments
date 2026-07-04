import { getDomainById } from "./registry";
import type { EvidenceSourceType } from "./types";

export interface GapFindingSignal {
  hits: number;
  total: number;
  category: string | null;
}

const GAP_MESSAGES: Partial<Record<EvidenceSourceType, string>> = {
  CLINICIAN_INTERVIEW:
    "No clinician interview evidence linked yet — consider a structured interview to explore this domain",
  CLINICIAN_OBSERVATION:
    "No direct observation evidence linked yet — consider session observation or behavioral notes",
  COLLATERAL:
    "No collateral informant evidence linked yet — consider partner, family, or school input where appropriate",
  MANUAL_NOTE: "No clinician notes added yet — free-text evidence can capture context not in modules",
};

function hasInconsistentFindings(findings: GapFindingSignal[]): boolean {
  if (findings.length < 2) return false;
  const rates = findings.map((f) => (f.total > 0 ? f.hits / f.total : 0));
  return Math.max(...rates) - Math.min(...rates) >= 0.4;
}

/** Suggest documentation gaps — prompts only, never diagnostic conclusions. */
export function computeSuggestedGaps(
  domainId: string,
  presentSources: EvidenceSourceType[],
  hasAnyEvidence: boolean,
  findings: GapFindingSignal[] = [],
): string[] {
  const domain = getDomainById(domainId);
  if (!domain) return [];

  const gaps: string[] = [];
  const present = new Set(presentSources);

  if (!hasAnyEvidence) {
    if (domainId === "developmental-history") {
      gaps.push("No developmental history evidence captured yet");
    } else if (domainId === "strengths-protective-factors") {
      gaps.push("Strengths and protective factors not yet documented");
    } else {
      gaps.push("No confirmed findings linked to this domain yet");
    }
    return gaps;
  }

  for (const expected of domain.expectedSourceTypes) {
    if (!present.has(expected) && GAP_MESSAGES[expected]) {
      gaps.push(GAP_MESSAGES[expected]!);
    }
  }

  if (
    domainId !== "developmental-history" &&
    !present.has("CLINICIAN_INTERVIEW") &&
    (present.has("FINDING") || present.has("CLIENT_SELF_REPORT"))
  ) {
    gaps.push(
      "Early developmental or childhood history not yet linked — consider whether retrospective history is relevant to this domain",
    );
  }

  if (hasInconsistentFindings(findings)) {
    gaps.push(
      "Supporting findings vary in indicator strength — consider whether additional evidence clarifies the pattern",
    );
  }

  return gaps;
}
