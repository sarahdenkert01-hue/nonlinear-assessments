import { getAllDomains, getDomainById } from "@/lib/domains/registry";

export interface DomainReportSection {
  domainId: string;
  label: string;
  /** Clinician-authored report-ready narrative (already trimmed). */
  summaryDraft: string;
}

/**
 * Select and order clinician-authored domain narratives for the report.
 * Order follows CLINICAL_DOMAINS (the review workflow nav order).
 * Empty / whitespace-only drafts are excluded.
 */
export function selectDomainReportSections(
  rows: { domainId: string; summaryDraft: string | null }[],
): DomainReportSection[] {
  const byId = new Map<string, string>();
  for (const row of rows) {
    const text = row.summaryDraft?.trim();
    if (!text) continue;
    byId.set(row.domainId, text);
  }

  const sections: DomainReportSection[] = [];
  for (const domain of getAllDomains()) {
    const summaryDraft = byId.get(domain.id);
    if (!summaryDraft) continue;
    sections.push({
      domainId: domain.id,
      label: domain.label,
      summaryDraft,
    });
  }

  // Preserve any unknown domain ids after the registry order (defensive).
  for (const [domainId, summaryDraft] of byId) {
    if (sections.some((s) => s.domainId === domainId)) continue;
    const label = getDomainById(domainId)?.label ?? domainId;
    sections.push({ domainId, label, summaryDraft });
  }

  return sections;
}

/** Render clinician domain narrative verbatim (normalize newlines only). */
export function formatDomainReportSection(section: DomainReportSection): string {
  const body = section.summaryDraft.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  return `### ${section.label}\n\n${body}`;
}

export function formatDomainReportSections(sections: DomainReportSection[]): string {
  if (sections.length === 0) {
    return "_No clinician-authored domain summaries are available yet._";
  }
  return sections.map(formatDomainReportSection).join("\n\n");
}
