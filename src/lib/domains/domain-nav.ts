import { getAllDomains } from "./registry";
import type { DomainSummary } from "./types";

export function getReviewableDomainNav(domains: DomainSummary[]): DomainSummary[] {
  return getAllDomains()
    .map((d) => domains.find((row) => row.domainId === d.id))
    .filter((d): d is DomainSummary => Boolean(d?.hasConfirmedFindings));
}

export function getAdjacentReviewableDomains(
  domains: DomainSummary[],
  currentDomainId: string,
): { prev: DomainSummary | null; next: DomainSummary | null; index: number; total: number } {
  const nav = getReviewableDomainNav(domains);
  const index = nav.findIndex((d) => d.domainId === currentDomainId);
  return {
    prev: index > 0 ? (nav[index - 1] ?? null) : null,
    next: index >= 0 && index < nav.length - 1 ? (nav[index + 1] ?? null) : null,
    index: index >= 0 ? index + 1 : 0,
    total: nav.length,
  };
}

export function computeDomainProgress(domain: {
  hasConfirmedFindings: boolean;
  evidenceSummaryDraft: string | null;
  clinicalQuestionPrompts: { askedAt: string | null }[];
  summaryDraft: string | null;
}): { steps: { done: boolean; label: string }[] } {
  const questionsExplored =
    domain.clinicalQuestionPrompts.length > 0 ||
    domain.clinicalQuestionPrompts.some((q) => q.askedAt);

  return {
    steps: [
      { done: domain.hasConfirmedFindings, label: "Evidence reviewed" },
      { done: Boolean(domain.evidenceSummaryDraft?.trim()), label: "Synthesis drafted" },
      { done: questionsExplored, label: "Questions explored" },
      { done: Boolean(domain.summaryDraft?.trim()), label: "Report complete" },
    ],
  };
}
