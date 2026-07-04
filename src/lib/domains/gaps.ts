import { getDomainById } from "./registry";
import type { EvidenceSourceType } from "./types";

export interface GapFindingSignal {
  hits: number;
  total: number;
  category: string | null;
}

export type OpportunityCategory =
  | "developmental-history"
  | "interview"
  | "collateral"
  | "observation"
  | "functional-impact"
  | "other";

export interface AssessmentOpportunity {
  category: OpportunityCategory;
  message: string;
}

export interface GroupedAssessmentOpportunities {
  category: OpportunityCategory;
  label: string;
  items: string[];
}

export const OPPORTUNITY_GROUP_LABELS: Record<OpportunityCategory, string> = {
  "developmental-history": "Developmental history",
  interview: "Interview opportunity",
  collateral: "Collateral / context",
  observation: "Observation",
  "functional-impact": "Functional impact",
  other: "Other",
};

const OPPORTUNITY_MESSAGES: Partial<Record<EvidenceSourceType, AssessmentOpportunity>> = {
  CLINICIAN_INTERVIEW: {
    category: "interview",
    message: "Explore this domain in a structured clinician interview",
  },
  CLINICIAN_OBSERVATION: {
    category: "observation",
    message: "Add session observation or behavioral notes",
  },
  COLLATERAL: {
    category: "collateral",
    message: "Consider partner, family, or school input where appropriate",
  },
  MANUAL_NOTE: {
    category: "other",
    message: "Capture contextual strengths, history, or observations not in modules",
  },
};

function hasInconsistentFindings(findings: GapFindingSignal[]): boolean {
  if (findings.length < 2) return false;
  const rates = findings.map((f) => (f.total > 0 ? f.hits / f.total : 0));
  return Math.max(...rates) - Math.min(...rates) >= 0.4;
}

function pushUnique(list: AssessmentOpportunity[], item: AssessmentOpportunity) {
  if (!list.some((o) => o.message === item.message)) list.push(item);
}

/** Assessment opportunities — prompts to strengthen understanding, not deficiencies. */
export function computeAssessmentOpportunities(
  domainId: string,
  presentSources: EvidenceSourceType[],
  hasAnyEvidence: boolean,
  findings: GapFindingSignal[] = [],
): AssessmentOpportunity[] {
  const domain = getDomainById(domainId);
  if (!domain) return [];

  const opportunities: AssessmentOpportunity[] = [];
  const present = new Set(presentSources);

  if (!hasAnyEvidence) {
    if (domainId === "developmental-history") {
      pushUnique(opportunities, {
        category: "developmental-history",
        message: "Gather lifespan and childhood presentation evidence",
      });
    } else if (domainId === "strengths-protective-factors") {
      pushUnique(opportunities, {
        category: "other",
        message: "Document protective factors and compensatory strategies",
      });
    } else {
      pushUnique(opportunities, {
        category: "other",
        message: "Confirm relevant findings in finding review or add a clinician note",
      });
    }
    return opportunities;
  }

  for (const expected of domain.expectedSourceTypes) {
    if (!present.has(expected) && OPPORTUNITY_MESSAGES[expected]) {
      pushUnique(opportunities, OPPORTUNITY_MESSAGES[expected]!);
    }
  }

  if (
    domainId !== "developmental-history" &&
    !present.has("CLINICIAN_INTERVIEW") &&
    (present.has("FINDING") || present.has("CLIENT_SELF_REPORT"))
  ) {
    pushUnique(opportunities, {
      category: "developmental-history",
      message: "Consider early presentation and longitudinal course for this domain",
    });
  }

  if (!present.has("COLLATERAL") && hasAnyEvidence) {
    pushUnique(opportunities, {
      category: "collateral",
      message: "Collateral input may clarify functional impact and daily patterns",
    });
  }

  if (domainId === "functional-impact" || findings.some((f) => f.category === "functional")) {
    if (!present.has("COLLATERAL")) {
      pushUnique(opportunities, {
        category: "functional-impact",
        message: "Clarify functional impact across work, home, and relationships",
      });
    }
  }

  if (hasInconsistentFindings(findings)) {
    pushUnique(opportunities, {
      category: "other",
      message: "Supporting findings vary in strength — additional evidence may sharpen the pattern",
    });
  }

  return opportunities;
}

export function groupAssessmentOpportunities(
  opportunities: AssessmentOpportunity[],
): GroupedAssessmentOpportunities[] {
  const byCategory = new Map<OpportunityCategory, string[]>();

  for (const opp of opportunities) {
    const list = byCategory.get(opp.category) ?? [];
    if (!list.includes(opp.message)) list.push(opp.message);
    byCategory.set(opp.category, list);
  }

  const order: OpportunityCategory[] = [
    "developmental-history",
    "interview",
    "collateral",
    "observation",
    "functional-impact",
    "other",
  ];

  return order
    .filter((cat) => byCategory.has(cat))
    .map((category) => ({
      category,
      label: OPPORTUNITY_GROUP_LABELS[category],
      items: byCategory.get(category)!,
    }));
}

/** Flat messages for hub badges and legacy consumers. */
export function computeSuggestedGaps(
  domainId: string,
  presentSources: EvidenceSourceType[],
  hasAnyEvidence: boolean,
  findings: GapFindingSignal[] = [],
): string[] {
  return computeAssessmentOpportunities(domainId, presentSources, hasAnyEvidence, findings).map(
    (o) => o.message,
  );
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
