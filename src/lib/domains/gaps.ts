import { getDomainById } from "./registry";
import type { EvidenceSourceType } from "./types";

export interface GapFindingSignal {
  hits: number;
  total: number;
  category: string | null;
}

const OPPORTUNITY_MESSAGES: Partial<Record<EvidenceSourceType, string>> = {
  CLINICIAN_INTERVIEW:
    "Interview opportunity: explore this domain in a structured clinician interview",
  CLINICIAN_OBSERVATION:
    "Observation opportunity: add session observation or behavioral notes",
  COLLATERAL:
    "Collateral opportunity: consider partner, family, or school input where appropriate",
  MANUAL_NOTE:
    "Note opportunity: capture contextual strengths, history, or observations not in modules",
};

function hasInconsistentFindings(findings: GapFindingSignal[]): boolean {
  if (findings.length < 2) return false;
  const rates = findings.map((f) => (f.total > 0 ? f.hits / f.total : 0));
  return Math.max(...rates) - Math.min(...rates) >= 0.4;
}

/** Assessment opportunities — prompts to strengthen understanding, not deficiencies. */
export function computeSuggestedGaps(
  domainId: string,
  presentSources: EvidenceSourceType[],
  hasAnyEvidence: boolean,
  findings: GapFindingSignal[] = [],
): string[] {
  const domain = getDomainById(domainId);
  if (!domain) return [];

  const opportunities: string[] = [];
  const present = new Set(presentSources);

  if (!hasAnyEvidence) {
    if (domainId === "developmental-history") {
      opportunities.push(
        "Developmental history opportunity: gather lifespan and childhood presentation evidence",
      );
    } else if (domainId === "strengths-protective-factors") {
      opportunities.push(
        "Strengths opportunity: document protective factors and compensatory strategies",
      );
    } else {
      opportunities.push(
        "Finding review opportunity: confirm relevant findings or add a clinician note for this domain",
      );
    }
    return opportunities;
  }

  for (const expected of domain.expectedSourceTypes) {
    if (!present.has(expected) && OPPORTUNITY_MESSAGES[expected]) {
      opportunities.push(OPPORTUNITY_MESSAGES[expected]!);
    }
  }

  if (
    domainId !== "developmental-history" &&
    !present.has("CLINICIAN_INTERVIEW") &&
    (present.has("FINDING") || present.has("CLIENT_SELF_REPORT"))
  ) {
    opportunities.push(
      "Developmental history opportunity: consider early presentation and longitudinal course for this domain",
    );
  }

  if (!present.has("COLLATERAL") && hasAnyEvidence) {
    opportunities.push(
      "Contextual opportunity: collateral input may clarify functional impact and daily patterns",
    );
  }

  if (hasInconsistentFindings(findings)) {
    opportunities.push(
      "Clarification opportunity: supporting findings vary in strength — additional evidence may sharpen the pattern",
    );
  }

  return opportunities;
}

export function computeEvidenceCoverage(
  domainId: string,
  presentSources: EvidenceSourceType[],
): { present: number; expected: number; percent: number } {
  const domain = getDomainById(domainId);
  if (!domain || domain.expectedSourceTypes.length === 0) {
    return { present: 0, expected: 0, percent: 0 };
  }
  const presentSet = new Set(presentSources);
  const expected = domain.expectedSourceTypes.length;
  const present = domain.expectedSourceTypes.filter((s) => presentSet.has(s)).length;
  return {
    present,
    expected,
    percent: Math.round((present / expected) * 100),
  };
}
