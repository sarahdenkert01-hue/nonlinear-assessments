import { getDomainById } from "./registry";
import type { EvidenceSourceType } from "./types";

const GAP_MESSAGES: Partial<Record<EvidenceSourceType, string>> = {
  CLINICIAN_INTERVIEW: "No clinician interview evidence linked yet",
  COLLATERAL: "No collateral informant evidence linked yet",
  MANUAL_NOTE: "No clinician notes added yet",
};

/** Suggest documentation gaps — prompts only, never diagnostic conclusions. */
export function computeSuggestedGaps(
  domainId: string,
  presentSources: EvidenceSourceType[],
  hasAnyEvidence: boolean,
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

  return gaps;
}
