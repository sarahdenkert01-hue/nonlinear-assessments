"use client";

import Link from "next/link";
import { computeDomainProgress, getAdjacentReviewableDomains } from "@/lib/domains/domain-nav";
import type { DomainDetail, DomainSummary } from "@/lib/domains/types";
import type { Confidence } from "@/lib/findings/types";

const CONFIDENCE_LEVELS: { value: Confidence | null; label: string }[] = [
  { value: null, label: "—" },
  { value: "LOW", label: "Low" },
  { value: "MODERATE", label: "Moderate" },
  { value: "HIGH", label: "High" },
];

function synthesisPreview(text: string | null, maxLen = 320): string {
  const trimmed = text?.trim();
  if (!trimmed) return "";
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen).trim()}…`;
}

export function SynthesisSidebar({
  episodeId,
  domain,
  allDomains,
  saving,
  onPatch,
  onCopySynthesisToReport,
  onScrollToSynthesis,
}: {
  episodeId: string;
  domain: DomainDetail;
  allDomains: DomainSummary[];
  saving: boolean;
  onPatch: (body: Record<string, unknown>) => void;
  onCopySynthesisToReport: () => void;
  onScrollToSynthesis: () => void;
}) {
  const nav = getAdjacentReviewableDomains(allDomains, domain.domainId);
  const progress = computeDomainProgress(domain);
  const preview = synthesisPreview(domain.evidenceSummaryDraft);

  return (
    <aside id="section-report" className="dm-report-column">
      <section className="dm-panel dm-section dm-report-panel dm-sidebar-panel">
        <div className="dm-sidebar-head">
          <h2 className="dm-sidebar-domain">{domain.label}</h2>
          <span
            className={`dm-badge${domain.reviewedAt ? " dm-badge--reviewed" : ""}`}
          >
            {progress.label}
          </span>
        </div>

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

        <div className="dm-sidebar-block">
          <div className="dm-sidebar-block-head">
            <span className="dm-field-label" style={{ margin: 0 }}>
              Clinical synthesis preview
            </span>
            <button type="button" className="dm-link-btn" onClick={onScrollToSynthesis}>
              Edit ↗
            </button>
          </div>
          {preview ? (
            <p className="dm-synthesis-preview">{preview}</p>
          ) : (
            <p className="dm-panel-hint" style={{ margin: 0 }}>
              No synthesis drafted yet.
            </p>
          )}
        </div>

        <div className="dm-sidebar-block">
          <p className="dm-question-label">6. What belongs in the report?</p>
          <h2 className="dm-panel-title">Report draft</h2>
          <p className="dm-panel-hint">How should I communicate this?</p>
          <textarea
            id="summary-draft"
            className="assessment-report-editor"
            style={{ minHeight: "9rem" }}
            value={domain.summaryDraft ?? ""}
            onChange={(e) =>
              onPatch({ summaryDraft: e.target.value || null })
            }
            placeholder="Clinician-owned report language…"
          />
          <div className="dm-actions">
            <button
              type="button"
              className="dm-btn dm-btn--primary"
              onClick={onCopySynthesisToReport}
              disabled={saving || !domain.evidenceSummaryDraft?.trim()}
            >
              Copy clinical synthesis → report draft
            </button>
          </div>
          {domain.summaryDraft?.trim() ? (
            <div className="dm-report-preview" aria-label="Report preview">
              <div className="dm-report-preview-label">Preview</div>
              <div className="dm-report-preview-body">{domain.summaryDraft}</div>
            </div>
          ) : null}
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
