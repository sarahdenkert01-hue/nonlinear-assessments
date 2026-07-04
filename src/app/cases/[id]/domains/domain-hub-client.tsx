"use client";

import Link from "next/link";
import type { DomainSummary } from "@/lib/domains/types";
import { sourceTypeLabel } from "@/lib/domains";
import "@/features/assessments/components/assessment.css";
import "./domains.css";

function DomainRow({ episodeId, domain }: { episodeId: string; domain: DomainSummary }) {
  const active = domain.hasConfirmedFindings;
  return (
    <Link
      href={`/cases/${episodeId}/domains/${domain.domainId}`}
      className={`dm-row${active ? " dm-row--active" : " dm-row--empty"}`}
    >
      <div className="dm-row-main">
        <div className="dm-row-label">{domain.label}</div>
        <div className="dm-row-meta">
          {active ? (
            <>
              <span>
                {domain.confirmedFindingCount} confirmed finding
                {domain.confirmedFindingCount === 1 ? "" : "s"}
              </span>
              {domain.sourceTypes.map((s) => (
                <span key={s} className="dm-badge">
                  {sourceTypeLabel(s)}
                </span>
              ))}
            </>
          ) : (
            <span>No confirmed findings linked</span>
          )}
          {domain.suggestedGaps.length > 0 && (
            <span className="dm-badge dm-badge--gap">
              {domain.suggestedGaps.length} gap
              {domain.suggestedGaps.length === 1 ? "" : "s"}
            </span>
          )}
          {domain.reviewedAt && (
            <span className="dm-badge dm-badge--reviewed">Reviewed</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function DomainHubClient({
  episodeId,
  clientName,
  domains,
  confirmedFindingCount,
}: {
  episodeId: string;
  clientName?: string;
  domains: DomainSummary[];
  confirmedFindingCount: number;
}) {
  const withEvidence = domains.filter((d) => d.hasConfirmedFindings);
  const withoutEvidence = domains.filter((d) => !d.hasConfirmedFindings);
  const reviewedCount = domains.filter((d) => d.reviewedAt).length;

  return (
    <div className="assessment-root">
      <div className="assessment-shell assessment-shell--wide">
        <header className="assessment-header">
          <h1 className="assessment-title">Domain review</h1>
          <p className="assessment-subtitle">
            {clientName
              ? `Synthesize confirmed findings for ${clientName} into clinical domains. Finding names are preserved below each domain.`
              : "Synthesize confirmed findings into clinical domains. Finding names are preserved below each domain."}
          </p>
        </header>

        <div className="dm-wrap">
          <p className="dm-intro">
            Domain review runs after finding triage. Only confirmed findings feed each domain.
            Confidence and summary drafts are clinician-owned — the tool never auto-confirms or
            auto-diagnoses.
          </p>

          <div className="dm-stats">
            <span>
              <strong>{confirmedFindingCount}</strong> confirmed finding
              {confirmedFindingCount === 1 ? "" : "s"}
            </span>
            <span>
              <strong>{withEvidence.length}</strong> domain
              {withEvidence.length === 1 ? "" : "s"} with evidence
            </span>
            <span>
              <strong>{reviewedCount}</strong> domain
              {reviewedCount === 1 ? "" : "s"} reviewed
            </span>
          </div>

          {confirmedFindingCount === 0 && (
            <div className="dm-panel">
              <p className="dm-panel-hint" style={{ marginBottom: "0.75rem" }}>
                Confirm findings in the screener review first, then return here to synthesize by
                domain.
              </p>
              <Link href={`/cases/${episodeId}/assessment`} className="dm-btn">
                Go to finding review
              </Link>
            </div>
          )}

          {withEvidence.length > 0 && (
            <section aria-label="Domains with confirmed findings">
              <h2 className="dm-section-title">Domains with confirmed findings</h2>
              <div className="dm-list">
                {withEvidence.map((d) => (
                  <DomainRow key={d.domainId} episodeId={episodeId} domain={d} />
                ))}
              </div>
            </section>
          )}

          {withoutEvidence.length > 0 && (
            <details className="dm-collapsed">
              <summary>
                Other domains ({withoutEvidence.length}) — no confirmed findings yet
              </summary>
              <div className="dm-list" style={{ padding: "0.5rem 1rem 1rem" }}>
                {withoutEvidence.map((d) => (
                  <DomainRow key={d.domainId} episodeId={episodeId} domain={d} />
                ))}
              </div>
            </details>
          )}

          <div className="dm-actions">
            <Link href={`/cases/${episodeId}/assessment`} className="dm-btn">
              ← Finding review
            </Link>
            <Link href={`/cases/${episodeId}`} className="dm-btn">
              Episode overview
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
