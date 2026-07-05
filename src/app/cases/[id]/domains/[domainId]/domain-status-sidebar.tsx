"use client";

import Link from "next/link";
import { computeDomainProgress, getAdjacentReviewableDomains } from "@/lib/domains/domain-nav";
import type { DomainDetail, DomainSummary } from "@/lib/domains/types";
import type { Confidence } from "@/lib/findings/types";

export type WorkspaceStage = "understand" | "formulate" | "report";

const CONFIDENCE_LEVELS: { value: Confidence | null; label: string }[] = [
  { value: null, label: "—" },
  { value: "LOW", label: "Low" },
  { value: "MODERATE", label: "Moderate" },
  { value: "HIGH", label: "High" },
];

function excerpt(text: string | null | undefined, max = 120): string | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? `${trimmed.slice(0, max).trim()}…` : trimmed;
}

export function DomainStatusSidebar({
  episodeId,
  domain,
  allDomains,
  saving,
  onPatch,
}: {
  episodeId: string;
  domain: DomainDetail;
  allDomains: DomainSummary[];
  saving: boolean;
  onPatch: (body: Record<string, unknown>) => void;
}) {
  const nav = getAdjacentReviewableDomains(allDomains, domain.domainId);
  const progress = computeDomainProgress(domain);
  const synthesisPreview = excerpt(domain.evidenceSummaryDraft);
  const reportPreview = excerpt(domain.summaryDraft);

  return (
    <aside className="dm-report-column">
      <section className="dm-sidebar-panel">
        <h2 className="dm-sidebar-domain">{domain.label}</h2>

        <ul className="dm-progress-tracker" aria-label="Domain progress">
          {progress.steps.map((step) => (
            <li
              key={step.label}
              className={`dm-progress-tracker-item${step.done ? " dm-progress-tracker-item--done" : ""}`}
            >
              <span className="dm-progress-tracker-icon" aria-hidden="true">
                {step.done ? "✓" : "○"}
              </span>
              {step.label}
            </li>
          ))}
        </ul>

        <div className="dm-sidebar-block">
          <span className="dm-sidebar-label">Clinical confidence</span>
          <div className="dm-conf dm-conf--full" role="group" aria-label="Clinical confidence">
            {CONFIDENCE_LEVELS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                className={`dm-conf-btn${domain.confidence === opt.value ? " dm-conf-btn--active" : ""}`}
                onClick={() => onPatch({ confidence: opt.value })}
                disabled={saving}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="dm-sidebar-mini">
          <span className="dm-sidebar-label">Synthesis</span>
          <p className="dm-sidebar-mini-text">
            {synthesisPreview ?? "Not drafted"}
          </p>
        </div>

        <div className="dm-sidebar-mini">
          <span className="dm-sidebar-label">Report</span>
          <p className="dm-sidebar-mini-text">{reportPreview ?? "Not written"}</p>
        </div>

        <nav className="dm-domain-nav" aria-label="Domain navigation">
          {nav.prev ? (
            <Link
              href={`/cases/${episodeId}/domains/${nav.prev.domainId}`}
              className="dm-btn dm-btn--ghost dm-domain-nav-btn"
            >
              ← Prev
            </Link>
          ) : (
            <span className="dm-domain-nav-spacer" />
          )}
          <span className="dm-domain-nav-count">
            {nav.total > 0 ? `${nav.index}/${nav.total}` : "—"}
          </span>
          {nav.next ? (
            <Link
              href={`/cases/${episodeId}/domains/${nav.next.domainId}`}
              className="dm-btn dm-btn--primary dm-domain-nav-btn"
            >
              Next →
            </Link>
          ) : (
            <span className="dm-domain-nav-spacer" />
          )}
        </nav>

        <Link href={`/cases/${episodeId}/domains`} className="dm-sidebar-link">
          All domains
        </Link>
      </section>
    </aside>
  );
}
