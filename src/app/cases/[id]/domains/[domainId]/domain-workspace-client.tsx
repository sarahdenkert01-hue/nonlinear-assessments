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
          <h1 className="assessment-title">{domain.label}</h1>
          <p className="assessment-subtitle">{domain.description}</p>
        </header>

        <div className="dm-wrap">
          {error && <div className="assessment-alert">{error}</div>}

          <div className="dm-panel">
            <h2 className="dm-panel-title">Confirmed findings</h2>
            <p className="dm-panel-hint">
              Theme-level finding names are preserved from screener review. Each links evidence
              from the original module.
            </p>
            {domain.findings.length === 0 ? (
              <p className="dm-panel-hint" style={{ marginBottom: 0 }}>
                No confirmed findings linked yet. Confirm findings in screener review first.
              </p>
            ) : (
              <ul className="dm-finding-list">
                {domain.findings.map((f) => (
                  <li key={f.id} className="dm-finding-item">
                    <div className="dm-finding-label">{f.label}</div>
                    <div className="dm-finding-meta">
                      {f.hits} of {f.total} indicators · {f.evidenceCount} evidence item
                      {f.evidenceCount === 1 ? "" : "s"}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="dm-panel">
            <h2 className="dm-panel-title">Evidence sources</h2>
            <div className="dm-row-meta" style={{ marginBottom: "0.75rem" }}>
              {domain.sourceTypes.length === 0 ? (
                <span className="dm-badge">None yet</span>
              ) : (
                domain.sourceTypes.map((s) => (
                  <span key={s} className="dm-badge">
                    {sourceTypeLabel(s)}
                  </span>
                ))
              )}
            </div>
            {domain.evidence
              .filter((e) => e.excerpt)
              .map((e) => (
                <div key={e.id} className="dm-finding-item" style={{ marginBottom: "0.5rem" }}>
                  <div className="dm-finding-meta">{sourceTypeLabel(e.sourceType)}</div>
                  <div className="dm-finding-label" style={{ fontWeight: 500 }}>
                    {e.excerpt}
                  </div>
                </div>
              ))}
          </div>

          {(domain.suggestedGaps.length > 0 || domain.evidenceGapNotes) && (
            <div className="dm-panel">
              <h2 className="dm-panel-title">Evidence gaps</h2>
              <p className="dm-panel-hint">
                Documentation prompts only — not diagnostic conclusions.
              </p>
              {domain.suggestedGaps.length > 0 && (
                <ul className="dm-gap-list">
                  {domain.suggestedGaps.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
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
            </div>
          )}

          <div className="dm-panel">
            <h2 className="dm-panel-title">Clinical synthesis</h2>
            <p className="dm-panel-hint">Your judgment — not set by the tool.</p>

            <div className="dm-field-label">Clinical confidence</div>
            <div className="dm-conf" role="group" aria-label="Clinical confidence">
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

            <label className="dm-field-label" htmlFor="alt-exp">
              Alternative explanations / differentials
            </label>
            <textarea
              id="alt-exp"
              className="assessment-notes"
              style={{ minHeight: "4.5rem" }}
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              onBlur={commitAlternatives}
            />

            <label className="dm-field-label" htmlFor="clinical-notes">
              Clinical notes
            </label>
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

            <label className="dm-field-label" htmlFor="summary-draft">
              Report summary draft
            </label>
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
          </div>

          <div className="dm-panel">
            <h2 className="dm-panel-title">Add clinician note</h2>
            <p className="dm-panel-hint">
              Useful for strengths, developmental history, or observations not captured in a
              module.
            </p>
            <textarea
              className="assessment-notes"
              style={{ minHeight: "3.5rem" }}
              value={manualNote}
              onChange={(e) => setManualNote(e.target.value)}
              placeholder="Free-text evidence for this domain…"
            />
            <div className="dm-actions">
              <button
                type="button"
                className="dm-btn dm-btn--primary"
                onClick={addManualNote}
                disabled={saving || !manualNote.trim()}
              >
                Add note as evidence
              </button>
            </div>
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
