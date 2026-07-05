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

export function DomainStatusSidebar({
  episodeId,
  domain,
  allDomains,
  stage,
  saving,
  onPatch,
  onStageChange,
}: {
  episodeId: string;
  domain: DomainDetail;
  allDomains: DomainSummary[];
  stage: WorkspaceStage;
  saving: boolean;
  onPatch: (body: Record<string, unknown>) => void;
  onStageChange: (stage: WorkspaceStage) => void;
}) {
  const nav = getAdjacentReviewableDomains(allDomains, domain.domainId);
  const progress = computeDomainProgress(domain);

  return (
    <aside className="dm-report-column">
      <section className="dm-panel dm-section dm-sidebar-panel">
        <div className="dm-sidebar-head">
          <h2 className="dm-sidebar-domain">{domain.label}</h2>
          <span className={`dm-badge${domain.reviewedAt ? " dm-badge--reviewed" : ""}`}>
            {progress.label}
          </span>
        </div>

        <nav className="dm-stage-nav-mini" aria-label="Workflow stage">
          {(
            [
              { id: "understand" as const, label: "Understand" },
              { id: "formulate" as const, label: "Formulate" },
              { id: "report" as const, label: "Report" },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              type="button"
              className={`dm-stage-nav-mini-btn${stage === s.id ? " dm-stage-nav-mini-btn--active" : ""}`}
              onClick={() => onStageChange(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <ul className="dm-progress-steps">
          {progress.steps.map((step) => (
            <li
              key={step.label}
              className={`dm-progress-step${step.done ? " dm-progress-step--done" : ""}`}
            >
              {step.label}
            </li>
          ))}
        </ul>

        <label className="dm-field-label">Domain confidence</label>
        <div className="dm-conf dm-conf--full" role="group" aria-label="Domain confidence">
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

        <div className="dm-domain-nav">
          {nav.prev ? (
            <Link
              href={`/cases/${episodeId}/domains/${nav.prev.domainId}`}
              className="dm-btn dm-domain-nav-btn"
            >
              ← {nav.prev.label}
            </Link>
          ) : (
            <span className="dm-domain-nav-spacer" />
          )}
          <span className="dm-domain-nav-count">
            {nav.total > 0 ? `${nav.index} / ${nav.total}` : "—"}
          </span>
          {nav.next ? (
            <Link
              href={`/cases/${episodeId}/domains/${nav.next.domainId}`}
              className="dm-btn dm-domain-nav-btn"
            >
              {nav.next.label} →
            </Link>
          ) : (
            <span className="dm-domain-nav-spacer" />
          )}
        </div>

        <div className="dm-actions">
          {!domain.reviewedAt ? (
            <button
              type="button"
              className="dm-btn dm-btn--primary"
              onClick={() => onPatch({ reviewed: true })}
              disabled={saving}
            >
              Mark domain reviewed
            </button>
          ) : (
            <button
              type="button"
              className="dm-btn"
              onClick={() => onPatch({ reviewed: false })}
              disabled={saving}
            >
              Unmark reviewed
            </button>
          )}
          <Link href={`/cases/${episodeId}/domains`} className="dm-btn">
            All domains
          </Link>
        </div>
      </section>
    </aside>
  );
}
