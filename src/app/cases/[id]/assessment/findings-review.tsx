"use client";

import { useMemo, useState } from "react";
import {
  ReportPanel,
  THEMES,
  requestSessionReport,
  type AssessmentReportResult,
} from "@/features/assessments";
import { parseApiResponse } from "@/lib/parse-api-response";
import type {
  Confidence,
  FindingRecord,
  FindingStatus,
} from "@/lib/findings/types";

interface FindingsReviewProps {
  sessionId: string;
  clientName?: string;
  initialFindings: FindingRecord[];
  clinicianNotes: string;
  onNotesChange: (notes: string) => void;
  reportDraft: string | null;
  reportGeneratedAt: string | null;
  reportFinalized: boolean;
  onReportDraftChange: (draft: string) => void;
  onReportGenerated: (report: AssessmentReportResult) => void;
  onFinalizeReport: () => void;
  onExportReport: () => void;
}

const CONFIDENCE_OPTIONS: { value: "" | Confidence; label: string }[] = [
  { value: "", label: "— not set" },
  { value: "LOW", label: "Low" },
  { value: "MODERATE", label: "Moderate" },
  { value: "HIGH", label: "High" },
];

function categoryBadgeClass(category: string | null): string {
  if (category === "ADHD") return "assessment-badge assessment-badge--adhd";
  if (category === "Autism") return "assessment-badge assessment-badge--autism";
  return "assessment-badge assessment-badge--both";
}

function isIncluded(status: FindingStatus): boolean {
  return status !== "EXCLUDED";
}

export function FindingsReview({
  sessionId,
  clientName,
  initialFindings,
  clinicianNotes,
  onNotesChange,
  reportDraft,
  reportGeneratedAt,
  reportFinalized,
  onReportDraftChange,
  onReportGenerated,
  onFinalizeReport,
  onExportReport,
}: FindingsReviewProps) {
  const [findings, setFindings] = useState<FindingRecord[]>(initialFindings);
  const [notes, setNotes] = useState(clinicianNotes);
  const [addCode, setAddCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const includedCount = findings.filter((f) => isIncluded(f.status)).length;
  const proposedCount = findings.filter((f) => f.status === "PROPOSED").length;

  // Themes the clinician can still add manually (not already represented by a finding).
  const addableThemes = useMemo(() => {
    const present = new Set(findings.map((f) => f.code));
    return THEMES.filter((t) => !present.has(t.id));
  }, [findings]);

  const applyUpdate = (finding: FindingRecord) => {
    setFindings((prev) => prev.map((f) => (f.id === finding.id ? finding : f)));
  };

  const patchFinding = async (
    findingId: string,
    patch: {
      status?: FindingStatus;
      confidence?: Confidence | null;
      alternativeExplanations?: string[];
      rationale?: string | null;
    },
  ) => {
    setBusyId(findingId);
    setError(null);
    try {
      const res = await fetch(`/api/episodes/${sessionId}/findings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ findingId, ...patch }),
      });
      const data = await parseApiResponse<{
        finding?: FindingRecord;
        error?: string;
      }>(res);
      if (!res.ok || !data.finding) throw new Error(data.error ?? "Update failed");
      applyUpdate(data.finding);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleAddFinding = async () => {
    if (!addCode) return;
    const theme = THEMES.find((t) => t.id === addCode);
    setError(null);
    try {
      const res = await fetch(`/api/episodes/${sessionId}/findings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: addCode,
          label: theme?.label ?? addCode,
          category: theme?.category,
        }),
      });
      const data = await parseApiResponse<{
        finding?: FindingRecord;
        error?: string;
      }>(res);
      if (!res.ok || !data.finding) throw new Error(data.error ?? "Add failed");
      setFindings((prev) => [...prev, data.finding as FindingRecord]);
      setAddCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add failed");
    }
  };

  const handleGenerate = ({ narrativeOnly }: { narrativeOnly: boolean }) =>
    requestSessionReport(sessionId, {
      overrides: {},
      clinicianNotes: notes.trim() || undefined,
      narrativeOnly,
    });

  return (
    <div className="assessment-root">
      <div className="assessment-shell assessment-shell--wide">
        <header className="assessment-header">
          <h1 className="assessment-title">Clinical findings</h1>
          <p className="assessment-subtitle">
            {clientName
              ? `Review, adjust, and confirm findings for ${clientName}. The algorithm proposes; you decide.`
              : "Review, adjust, and confirm findings. The algorithm proposes; you decide."}
          </p>
        </header>

        <div className="assessment-review-summary">
          <span>
            <strong>{findings.length}</strong> findings
          </span>
          <span>
            <strong>{proposedCount}</strong> awaiting your review
          </span>
          <span>
            <strong>{includedCount}</strong> included in report
          </span>
        </div>

        {error && <div className="assessment-alert">{error}</div>}

        <section aria-label="Findings" style={{ marginTop: "1rem" }}>
          {findings.length === 0 ? (
            <p className="assessment-subtitle">
              No findings were proposed from the responses. You can add findings
              manually below.
            </p>
          ) : (
            <div className="assessment-theme-grid">
              {findings.map((finding) => (
                <FindingCard
                  key={finding.id}
                  finding={finding}
                  busy={busyId === finding.id}
                  onStatus={(status) => patchFinding(finding.id, { status })}
                  onConfidence={(confidence) =>
                    patchFinding(finding.id, { confidence })
                  }
                  onAlternatives={(alternativeExplanations) =>
                    patchFinding(finding.id, { alternativeExplanations })
                  }
                />
              ))}
            </div>
          )}
        </section>

        {addableThemes.length > 0 && !reportFinalized && (
          <div className="assessment-detail-panel" style={{ marginTop: "1.5rem" }}>
            <h3>Add a finding</h3>
            <p className="assessment-theme-meta" style={{ marginBottom: "0.75rem" }}>
              Add a clinically relevant theme the algorithm did not flag. Any endorsed
              items for that theme are linked as evidence.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <select
                value={addCode}
                onChange={(e) => setAddCode(e.target.value)}
                className="assessment-select"
              >
                <option value="">Select a theme…</option>
                {addableThemes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} ({t.category})
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="assessment-btn assessment-btn--secondary"
                onClick={handleAddFinding}
                disabled={!addCode}
              >
                Add finding
              </button>
            </div>
          </div>
        )}

        <label
          htmlFor="clinician-notes"
          style={{
            display: "block",
            marginTop: "2rem",
            fontSize: "0.875rem",
            fontWeight: 500,
          }}
        >
          Clinician notes (optional)
        </label>
        <textarea
          id="clinician-notes"
          className="assessment-notes"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            onNotesChange(e.target.value);
          }}
          placeholder="Clinical observations, context, or rationale for findings..."
        />

        <ReportPanel
          canGenerate={includedCount > 0}
          sessionId={sessionId}
          initialReportDraft={reportDraft}
          reportGeneratedAt={reportGeneratedAt}
          reportFinalized={reportFinalized}
          onGenerate={handleGenerate}
          onReportDraftChange={onReportDraftChange}
          onReportGenerated={onReportGenerated}
          onFinalizeReport={onFinalizeReport}
          onExportReport={onExportReport}
        />
      </div>
    </div>
  );
}

function statusBadge(finding: FindingRecord) {
  if (finding.status === "EXCLUDED") {
    return <span className="assessment-badge assessment-badge--flagged">Excluded</span>;
  }
  if (finding.status === "PROPOSED") {
    return <span className="assessment-badge assessment-badge--flagged">Proposed</span>;
  }
  return <span className="assessment-badge assessment-badge--both">Included</span>;
}

function FindingCard({
  finding,
  busy,
  onStatus,
  onConfidence,
  onAlternatives,
}: {
  finding: FindingRecord;
  busy: boolean;
  onStatus: (status: FindingStatus) => void;
  onConfidence: (confidence: Confidence | null) => void;
  onAlternatives: (alternatives: string[]) => void;
}) {
  const [altText, setAltText] = useState(finding.alternativeExplanations.join("\n"));
  const barWidth =
    finding.total > 0
      ? `${Math.round((finding.hits / finding.total) * 100)}%`
      : "0%";
  const included = isIncluded(finding.status);

  const commitAlternatives = () => {
    const next = altText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    // Avoid a needless request when nothing changed.
    if (next.join("\n") === finding.alternativeExplanations.join("\n")) return;
    onAlternatives(next);
  };

  return (
    <article
      className={`assessment-theme-card${included ? " assessment-theme-card--included" : " assessment-theme-card--excluded"}`}
    >
      <div className="assessment-theme-card-header">
        <span className={categoryBadgeClass(finding.category)}>
          {finding.category ?? "General"}
        </span>
        {statusBadge(finding)}
        {finding.source === "CLINICIAN" && (
          <span className="assessment-badge assessment-badge--both">Clinician-added</span>
        )}
      </div>

      <h3 className="assessment-theme-label">{finding.label}</h3>
      <div className="assessment-theme-bar" aria-hidden>
        <div className="assessment-theme-bar-fill" style={{ width: barWidth }} />
      </div>
      <p className="assessment-theme-meta">
        {finding.hits} of {finding.total} indicators endorsed
      </p>

      <div className="assessment-override-row" role="group" aria-label="Set status">
        {finding.source === "ALGORITHM" && (
          <button
            type="button"
            className={`assessment-override-btn assessment-override-btn--auto${finding.status === "PROPOSED" ? " assessment-override-btn--active" : ""}`}
            onClick={() => onStatus("PROPOSED")}
            disabled={busy}
          >
            Proposed
          </button>
        )}
        <button
          type="button"
          className={`assessment-override-btn assessment-override-btn--include${finding.status === "ACCEPTED" || finding.status === "EDITED" ? " assessment-override-btn--active" : ""}`}
          onClick={() => onStatus("ACCEPTED")}
          disabled={busy}
        >
          Include
        </button>
        <button
          type="button"
          className={`assessment-override-btn assessment-override-btn--exclude${finding.status === "EXCLUDED" ? " assessment-override-btn--active" : ""}`}
          onClick={() => onStatus("EXCLUDED")}
          disabled={busy}
        >
          Exclude
        </button>
      </div>

      <label className="assessment-field-label" htmlFor={`confidence-${finding.id}`}>
        Clinical confidence
      </label>
      <select
        id={`confidence-${finding.id}`}
        className="assessment-select"
        value={finding.confidence ?? ""}
        onChange={(e) =>
          onConfidence(e.target.value ? (e.target.value as Confidence) : null)
        }
        disabled={busy}
      >
        {CONFIDENCE_OPTIONS.map((opt) => (
          <option key={opt.label} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <label className="assessment-field-label" htmlFor={`alt-${finding.id}`}>
        Alternative explanations / differentials
      </label>
      <textarea
        id={`alt-${finding.id}`}
        className="assessment-notes"
        style={{ minHeight: "4.5rem" }}
        value={altText}
        onChange={(e) => setAltText(e.target.value)}
        onBlur={commitAlternatives}
        placeholder="One per line (e.g. anxiety, trauma, sensory environment)…"
        disabled={busy}
      />

      <details className="assessment-evidence">
        <summary>
          Evidence · {finding.evidence.length} endorsed item
          {finding.evidence.length === 1 ? "" : "s"}
        </summary>
        {finding.evidence.length === 0 ? (
          <p className="assessment-theme-meta">
            No endorsed items linked. This finding rests on clinician judgment.
          </p>
        ) : (
          <ul className="assessment-detail-list">
            {finding.evidence.map((item) => (
              <li key={item.id}>
                <strong>{item.itemId}</strong> — {item.text}
                <br />
                <span style={{ color: "#9ca3af" }}>Answer: {item.answer}</span>
              </li>
            ))}
          </ul>
        )}
      </details>
    </article>
  );
}
