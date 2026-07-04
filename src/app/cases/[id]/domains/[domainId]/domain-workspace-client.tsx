"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useDebouncedCallback } from "@/lib/hooks/useDebouncedCallback";
import { parseApiResponse } from "@/lib/parse-api-response";
import { sourceTypeLabel } from "@/lib/domains";
import type { Confidence } from "@/lib/findings/types";
import type { DomainDetail } from "@/lib/domains/types";
import "@/features/assessments/components/assessment.css";
import "../domains.css";

const CONFIDENCE_LEVELS: { value: Confidence | null; label: string }[] = [
  { value: null, label: "—" },
  { value: "LOW", label: "Low" },
  { value: "MODERATE", label: "Moderate" },
  { value: "HIGH", label: "High" },
];

export function DomainWorkspaceClient({
  episodeId,
  initialDomain,
}: {
  episodeId: string;
  initialDomain: DomainDetail;
}) {
  const [domain, setDomain] = useState(initialDomain);
  const [altText, setAltText] = useState(initialDomain.alternativeExplanations.join("\n"));
  const [manualNote, setManualNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const patch = useCallback(
    async (body: Record<string, unknown>) => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch(`/api/episodes/${episodeId}/domains/${domain.domainId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await parseApiResponse<{ domain?: DomainDetail; error?: string }>(res);
        if (!res.ok || !data.domain) throw new Error(data.error ?? "Save failed");
        setDomain(data.domain);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      } finally {
        setSaving(false);
      }
    },
    [episodeId, domain.domainId],
  );

  const debouncedPatch = useDebouncedCallback(patch, 600);

  const commitAlternatives = () => {
    const next = altText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (next.join("\n") === domain.alternativeExplanations.join("\n")) return;
    void patch({ alternativeExplanations: next });
  };

  const generateEvidenceSummary = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/episodes/${episodeId}/domains/${domain.domainId}/evidence-summary`,
        { method: "POST" },
      );
      const data = await parseApiResponse<{ domain?: DomainDetail; error?: string }>(res);
      if (!res.ok || !data.domain) throw new Error(data.error ?? "Generation failed");
      setDomain(data.domain);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const copyToReportDraft = () => {
    const next = domain.evidenceSummaryDraft?.trim();
    if (!next) return;
    setDomain((d) => ({ ...d, summaryDraft: next }));
    void patch({ summaryDraft: next });
  };

  const addManualNote = async () => {
    if (!manualNote.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/episodes/${episodeId}/domains/${domain.domainId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ excerpt: manualNote.trim() }),
      });
      const data = await parseApiResponse<{ domain?: DomainDetail; error?: string }>(res);
      if (!res.ok || !data.domain) throw new Error(data.error ?? "Failed");
      setDomain(data.domain);
      setManualNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="assessment-root">
      <div className="assessment-shell assessment-shell--wide">
        <header className="assessment-header">
          <p className="assessment-subtitle" style={{ marginBottom: "0.35rem" }}>
            <Link href={`/cases/${episodeId}/domains`}>Domain review</Link>
            {" · "}
            <Link href={`/cases/${episodeId}/assessment`}>Finding review</Link>
          </p>
          <h1 className="assessment-title">Clinical Synthesis</h1>
          <p className="assessment-subtitle">
            Synthesize confirmed findings into an understanding of this clinical domain. Your
            judgment and report language remain separate from AI-assisted evidence summaries.
          </p>
        </header>

        <div className="dm-wrap">
          {error && <div className="assessment-alert">{error}</div>}

          {/* 1. Domain overview (sticky) */}
          <div className="dm-overview">
            <div className="dm-overview-main">
              <h2 className="dm-overview-title">{domain.label}</h2>
              <p className="dm-overview-desc">{domain.description}</p>
            </div>
            <div className="dm-overview-stats">
              <span>
                <strong>{domain.confirmedFindingCount}</strong> confirmed finding
                {domain.confirmedFindingCount === 1 ? "" : "s"}
              </span>
              <span>
                <strong>{domain.evidenceCount}</strong> evidence item
                {domain.evidenceCount === 1 ? "" : "s"}
              </span>
              {domain.sourceTypes.length > 0 ? (
                <span className="dm-overview-sources">
                  {domain.sourceTypes.map((s) => (
                    <span key={s} className="dm-badge">
                      {sourceTypeLabel(s)}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="dm-badge">No sources yet</span>
              )}
              {domain.suggestedGaps.length > 0 && (
                <span className="dm-badge dm-badge--gap">
                  {domain.suggestedGaps.length} gap prompt
                  {domain.suggestedGaps.length === 1 ? "" : "s"}
                </span>
              )}
              {domain.confidence && (
                <span className="dm-badge">Confidence: {domain.confidence.toLowerCase()}</span>
              )}
            </div>
          </div>

          {/* 2. Supporting findings */}
          <div className="dm-panel">
            <h2 className="dm-panel-title">Supporting findings</h2>
            <p className="dm-panel-hint">
              Theme-level finding names from screener review. Expand to see item-level evidence.
            </p>
            {domain.findings.length === 0 ? (
              <p className="dm-panel-hint" style={{ marginBottom: 0 }}>
                No confirmed findings linked yet. Confirm findings in finding review first.
              </p>
            ) : (
              <div className="dm-finding-list">
                {domain.findings.map((f) => (
                  <details key={f.id} className="dm-finding-expand">
                    <summary className="dm-finding-expand-summary">
                      <span className="dm-finding-label">{f.label}</span>
                      <span className="dm-finding-meta">
                        {f.hits} of {f.total} indicators · {f.evidenceCount} evidence item
                        {f.evidenceCount === 1 ? "" : "s"}
                      </span>
                    </summary>
                    {f.evidence.length === 0 ? (
                      <p className="dm-panel-hint" style={{ margin: "0.5rem 0 0" }}>
                        No item-level evidence recorded.
                      </p>
                    ) : (
                      <ul className="dm-evidence-items">
                        {f.evidence.map((e) => (
                          <li key={e.id} className="dm-evidence-item">
                            <div className="dm-evidence-q">{e.text}</div>
                            <div className="dm-evidence-a">{e.answer || "—"}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </details>
                ))}
              </div>
            )}
          </div>

          {/* 3. Evidence summary (AI-assisted) */}
          <div className="dm-panel">
            <div className="dm-panel-head">
              <h2 className="dm-panel-title">Evidence summary</h2>
              <span className="dm-ai-badge">AI Draft — Review and edit before using.</span>
            </div>
            <p className="dm-panel-hint">
              AI-assisted synthesis of supporting evidence. This does not populate your report
              automatically.
            </p>
            <textarea
              id="evidence-summary"
              className="assessment-report-editor"
              style={{ minHeight: "7rem" }}
              value={domain.evidenceSummaryDraft ?? ""}
              onChange={(e) => {
                setDomain((d) => ({ ...d, evidenceSummaryDraft: e.target.value }));
                debouncedPatch({ evidenceSummaryDraft: e.target.value || null });
              }}
              placeholder="Generate or write an evidence summary for clinician review…"
            />
            <div className="dm-actions">
              <button
                type="button"
                className="dm-btn dm-btn--primary"
                onClick={generateEvidenceSummary}
                disabled={generating || saving}
              >
                {generating ? "Generating…" : "Generate evidence summary"}
              </button>
              <button
                type="button"
                className="dm-btn"
                onClick={copyToReportDraft}
                disabled={saving || !domain.evidenceSummaryDraft?.trim()}
              >
                Copy to report draft
              </button>
            </div>
          </div>

          {/* 4. Evidence gaps */}
          <div className="dm-panel">
            <h2 className="dm-panel-title">Evidence gaps</h2>
            <p className="dm-panel-hint">
              Documentation prompts only — not diagnostic conclusions.
            </p>
            {domain.suggestedGaps.length > 0 ? (
              <ul className="dm-gap-list">
                {domain.suggestedGaps.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            ) : (
              <p className="dm-panel-hint" style={{ marginBottom: "0.75rem" }}>
                No gap prompts for this domain at this time.
              </p>
            )}
            <label className="dm-field-label" htmlFor="gap-notes">
              Clinician notes on gaps
            </label>
            <textarea
              id="gap-notes"
              className="assessment-notes"
              style={{ marginTop: 0, minHeight: "4rem" }}
              value={domain.evidenceGapNotes ?? ""}
              onChange={(e) => {
                setDomain((d) => ({ ...d, evidenceGapNotes: e.target.value }));
                debouncedPatch({ evidenceGapNotes: e.target.value || null });
              }}
            />
            <div className="dm-add-note">
              <label className="dm-field-label" htmlFor="manual-note">
                Add evidence note
              </label>
              <textarea
                id="manual-note"
                className="assessment-notes"
                style={{ minHeight: "3rem" }}
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
                placeholder="Strengths, developmental history, or observations not in a module…"
              />
              <div className="dm-actions">
                <button
                  type="button"
                  className="dm-btn"
                  onClick={addManualNote}
                  disabled={saving || !manualNote.trim()}
                >
                  Add note as evidence
                </button>
              </div>
            </div>
          </div>

          {/* 5. Differential considerations */}
          <div className="dm-panel">
            <h2 className="dm-panel-title">Differential considerations</h2>
            <p className="dm-panel-hint">
              Alternative explanations you are weighing — clinician-owned, not AI-generated.
            </p>
            <textarea
              id="alt-exp"
              className="assessment-notes"
              style={{ minHeight: "4.5rem" }}
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              onBlur={commitAlternatives}
              placeholder="One alternative per line…"
            />
          </div>

          {/* 6. Clinical notes */}
          <div className="dm-panel">
            <h2 className="dm-panel-title">Clinical notes</h2>
            <p className="dm-panel-hint">Private synthesis notes — not included in the report draft.</p>
            <textarea
              id="clinical-notes"
              className="assessment-notes"
              style={{ minHeight: "5rem" }}
              value={domain.clinicalNotes ?? ""}
              onChange={(e) => {
                setDomain((d) => ({ ...d, clinicalNotes: e.target.value }));
                debouncedPatch({ clinicalNotes: e.target.value || null });
              }}
            />
          </div>

          {/* 7. Domain confidence */}
          <div className="dm-panel">
            <h2 className="dm-panel-title">Domain confidence</h2>
            <p className="dm-panel-hint">Your clinical confidence for this domain — unset by default.</p>
            <div className="dm-conf" role="group" aria-label="Domain confidence">
              {CONFIDENCE_LEVELS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  className={`dm-conf-btn${domain.confidence === opt.value ? " dm-conf-btn--active" : ""}`}
                  onClick={() => void patch({ confidence: opt.value })}
                  disabled={saving}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 8. Report preview */}
          <div className="dm-panel">
            <h2 className="dm-panel-title">Report draft</h2>
            <p className="dm-panel-hint">
              Clinician-owned report language for this domain. Edit directly or copy from the
              evidence summary above.
            </p>
            <textarea
              id="summary-draft"
              className="assessment-report-editor"
              style={{ minHeight: "8rem" }}
              value={domain.summaryDraft ?? ""}
              onChange={(e) => {
                setDomain((d) => ({ ...d, summaryDraft: e.target.value }));
                debouncedPatch({ summaryDraft: e.target.value || null });
              }}
              placeholder="Editable domain-level summary for the report…"
            />
            {domain.summaryDraft?.trim() ? (
              <div className="dm-report-preview" aria-label="Report preview">
                <div className="dm-report-preview-label">Preview</div>
                <div className="dm-report-preview-body">{domain.summaryDraft}</div>
              </div>
            ) : null}
          </div>

          <div className="dm-actions">
            {!domain.reviewedAt ? (
              <button
                type="button"
                className="dm-btn dm-btn--primary"
                onClick={() => void patch({ reviewed: true })}
                disabled={saving}
              >
                Mark domain reviewed
              </button>
            ) : (
              <span className="dm-badge dm-badge--reviewed">
                Reviewed {new Date(domain.reviewedAt).toLocaleDateString()}
              </span>
            )}
            <Link href={`/cases/${episodeId}/domains`} className="dm-btn">
              ← All domains
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
