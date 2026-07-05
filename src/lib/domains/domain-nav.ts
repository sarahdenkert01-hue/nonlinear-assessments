import { hasFormulationStarted } from "./clinical-formulation";
import { getAllDomains } from "./registry";
import type { ClinicalFormulationDraft, DomainSummary } from "./types";

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
  clinicalFormulation: ClinicalFormulationDraft;
  summaryDraft: string | null;
  reviewedAt: string | null;
}): { label: string; steps: { done: boolean; label: string }[] } {
  const steps = [
    { done: domain.hasConfirmedFindings, label: "Evidence linked" },
    { done: Boolean(domain.evidenceSummaryDraft?.trim()), label: "Synthesis drafted" },
    { done: hasFormulationStarted(domain.clinicalFormulation), label: "Formulation started" },
    { done: Boolean(domain.summaryDraft?.trim()), label: "Report drafted" },
    { done: Boolean(domain.reviewedAt), label: "Domain reviewed" },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const label = domain.reviewedAt
    ? "Reviewed"
    : doneCount === 0
      ? "Not started"
      : doneCount >= 3
        ? "In progress"
        : "Getting started";
  return { label, steps };
}
