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
import "./findings-review.css";

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

const CONFIDENCE_LEVELS: { value: Confidence | null; label: string; title: string }[] = [
  { value: null, label: "—", title: "Not set" },
  { value: "LOW", label: "Low", title: "Low confidence" },
  { value: "MODERATE", label: "Moderate", title: "Moderate confidence" },
  { value: "HIGH", label: "High", title: "High confidence" },
];

function categoryBadgeClass(category: string | null): string {
  if (category === "ADHD") return "assessment-badge assessment-badge--adhd";
  if (category === "Autism") return "assessment-badge assessment-badge--autism";
  return "assessment-badge assessment-badge--both";
}

function isIncluded(status: FindingStatus): boolean {
  return status !== "EXCLUDED";
}

// Objective signal derived from the responses — kept deliberately separate from clinical
// confidence, which is the clinician's own judgment.
function evidenceStrength(finding: FindingRecord): {
  level: 0 | 1 | 2 | 3;
  word: string;
  none: boolean;
} {
  if (finding.hits <= 0) {
    return { level: 0, word: "Clinician judgment", none: true };
  }
  const ratio = finding.total > 0 ? finding.hits / finding.total : 1;
  if (ratio >= 0.667) return { level: 3, word: "Strong", none: false };
  if (ratio >= 0.334) return { level: 2, word: "Moderate", none: false };
  return { level: 1, word: "Limited", none: false };
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

  const needsReview = findings.filter((f) => f.status === "PROPOSED");
  const included = findings.filter(
    (f) => f.status === "ACCEPTED" || f.status === "EDITED",
  );
  const excluded = findings.filter((f) => f.status === "EXCLUDED");

  const decidedCount = findings.length - needsReview.length;
  const includedCount = findings.filter((f) => isIncluded(f.status)).length;
  const progressPct =
    findings.length > 0 ? Math.round((decidedCount / findings.length) * 100) : 0;

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
              ? `Review the evidence for ${clientName}, then decide what belongs in the report. The tool proposes; you decide.`
              : "Review the evidence, then decide what belongs in the report. The tool proposes; you decide."}
          </p>
        </header>

        <div className="fr-wrap">
          {findings.length > 0 && (
            <div className="fr-progress">
              <div className="fr-progress-top">
                <span className="fr-progress-headline">
                  {needsReview.length === 0
                    ? "All findings reviewed"
                    : `${needsReview.length} finding${needsReview.length === 1 ? "" : "s"} awaiting your decision`}
                </span>
                <div className="fr-progress-counts">
                  <span>
                    <strong>{decidedCount}</strong>/{findings.length} decided
                  </span>
                  <span>
                    <strong>{includedCount}</strong> in report
                  </span>
                  <span>
                    <strong>{excluded.length}</strong> excluded
                  </span>
                </div>
              </div>
              <div
                className="fr-progress-track"
                role="progressbar"
                aria-valuenow={progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="fr-progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          )}

          {error && <div className="assessment-alert">{error}</div>}

          {findings.length === 0 && (
            <div className="fr-empty">
              No findings were proposed from the responses. You can add clinically
              relevant findings manually below.
            </div>
          )}

          {needsReview.length > 0 && (
            <section className="fr-section fr-section--review" aria-label="Needs your review">
              <div className="fr-section-head">
                <span className="fr-section-title">Needs your review</span>
                <span className="fr-section-count">{needsReview.length}</span>
              </div>
              <div className="fr-list">
                {needsReview.map((finding) => (
                  <FindingCard
                    key={finding.id}
                    finding={finding}
                    section="review"
                    busy={busyId === finding.id}
                    disabled={reportFinalized}
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
            </section>
          )}

          {included.length > 0 && (
            <section className="fr-section" aria-label="Included in report">
              <div className="fr-section-head">
                <span className="fr-section-title">Included in report</span>
                <span className="fr-section-count">{included.length}</span>
              </div>
              <div className="fr-list">
                {included.map((finding) => (
                  <FindingCard
                    key={finding.id}
                    finding={finding}
                    section="included"
                    busy={busyId === finding.id}
                    disabled={reportFinalized}
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
            </section>
          )}

          {excluded.length > 0 && (
            <details className="fr-excluded">
              <summary>Excluded findings · {excluded.length}</summary>
              <div className="fr-excluded-body">
                {excluded.map((finding) => (
                  <div key={finding.id} className="fr-excluded-row">
                    <span className="fr-excluded-name">
                      <strong>{finding.label}</strong>
                      {finding.category ? ` · ${finding.category}` : ""}
                    </span>
                    <button
                      type="button"
                      className="fr-btn fr-btn--ghost"
                      onClick={() => patchFinding(finding.id, { status: "ACCEPTED" })}
                      disabled={busyId === finding.id || reportFinalized}
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            </details>
          )}

          {addableThemes.length > 0 && !reportFinalized && (
            <div className="fr-panel">
              <h3 className="fr-panel-title">Add a finding</h3>
              <p className="fr-panel-hint">
                Add a clinically relevant theme the tool did not flag. Any endorsed
                items for that theme are linked as evidence automatically.
              </p>
              <div className="fr-add-row">
                <select
                  value={addCode}
                  onChange={(e) => setAddCode(e.target.value)}
                  className="assessment-select"
                  style={{ maxWidth: "22rem" }}
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
                  className="fr-btn fr-btn--ghost"
                  onClick={handleAddFinding}
                  disabled={!addCode}
                >
                  Add finding
                </button>
              </div>
            </div>
          )}

          <div className="fr-panel">
            <label htmlFor="clinician-notes" className="fr-panel-title">
              Clinician notes
            </label>
            <p className="fr-panel-hint">
              Overall clinical context or reasoning. Included in the report draft.
            </p>
            <textarea
              id="clinician-notes"
              className="assessment-notes"
              style={{ marginTop: 0 }}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                onNotesChange(e.target.value);
              }}
              placeholder="Clinical observations, context, or rationale for findings..."
            />
          </div>

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
    </div>
  );
}

function FindingCard({
  finding,
  section,
  busy,
  disabled,
  onStatus,
  onConfidence,
  onAlternatives,
}: {
  finding: FindingRecord;
  section: "review" | "included";
  busy: boolean;
  disabled: boolean;
  onStatus: (status: FindingStatus) => void;
  onConfidence: (confidence: Confidence | null) => void;
  onAlternatives: (alternatives: string[]) => void;
}) {
  const [altText, setAltText] = useState(finding.alternativeExplanations.join("\n"));
  const strength = evidenceStrength(finding);
  const locked = busy || disabled;

  const commitAlternatives = () => {
    const next = altText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (next.join("\n") === finding.alternativeExplanations.join("\n")) return;
    onAlternatives(next);
  };

  const evidenceCount = finding.evidence.length;

  return (
    <article className={`fr-card fr-card--${section}`}>
      <div className="fr-card-head">
        <div className="fr-card-titlewrap">
          <div className="fr-card-tags">
            <span className={categoryBadgeClass(finding.category)}>
              {finding.category ?? "General"}
            </span>
            {finding.source === "CLINICIAN" && (
              <span className="fr-source">Clinician-added</span>
            )}
          </div>
          <h3 className="fr-card-label">{finding.label}</h3>
        </div>
        <span
          className={`fr-status fr-status--${section === "review" ? "review" : "included"}`}
        >
          {section === "review" ? "Needs review" : "Included"}
        </span>
      </div>

      <div className="fr-metrics">
        <div>
          <div className="fr-metric-label">Evidence strength</div>
          <div className={`fr-strength${strength.none ? " fr-strength--none" : ""}`}>
            {!strength.none && (
              <span className="fr-meter" aria-hidden>
                {[1, 2, 3].map((seg) => (
                  <span
                    key={seg}
                    className={`fr-meter-seg${seg <= strength.level ? " fr-meter-seg--on" : ""}`}
                  />
                ))}
              </span>
            )}
            <span className="fr-strength-word">{strength.word}</span>
          </div>
          <div className="fr-metric-hint">
            {finding.total > 0
              ? `${finding.hits} of ${finding.total} indicators endorsed`
              : "Based on your clinical judgment"}
          </div>
        </div>

        <div>
          <div className="fr-metric-label">Clinical confidence</div>
          <div className="fr-conf" role="group" aria-label="Clinical confidence">
            {CONFIDENCE_LEVELS.map((opt) => (
              <button
                key={opt.title}
                type="button"
                title={opt.title}
                className={`fr-conf-btn${finding.confidence === opt.value ? " fr-conf-btn--active" : ""}`}
                onClick={() => onConfidence(opt.value)}
                disabled={locked}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="fr-metric-hint">Your judgment — not set by the tool</div>
        </div>
      </div>

      <details className="fr-disclosure" open={section === "review"}>
        <summary>
          Review evidence{" "}
          <span className="fr-disclosure-meta">
            · {evidenceCount} endorsed item{evidenceCount === 1 ? "" : "s"}
          </span>
        </summary>
        <div className="fr-evidence-body">
          {evidenceCount === 0 ? (
            <p className="fr-evidence-empty">
              No endorsed items are linked to this finding. It rests on your clinical
              judgment.
            </p>
          ) : (
            finding.evidence.map((item) => (
              <div key={item.id} className="fr-evidence-item">
                <div className="fr-evidence-q">{item.text}</div>
                <div className="fr-evidence-a">
                  Client responded
                  <span className="fr-answer-chip">{item.answer || "—"}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </details>

      <details className="fr-disclosure">
        <summary>
          Alternative explanations
          {finding.alternativeExplanations.length > 0 && (
            <span className="fr-disclosure-meta">
              · {finding.alternativeExplanations.length} noted
            </span>
          )}
        </summary>
        <div className="fr-alt-body">
          <textarea
            id={`alt-${finding.id}`}
            className="assessment-notes"
            style={{ minHeight: "4.5rem" }}
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            onBlur={commitAlternatives}
            placeholder="Differentials or other explanations to consider — one per line (e.g. anxiety, trauma, sensory environment)…"
            disabled={locked}
          />
        </div>
      </details>

      <div className="fr-actions">
        {section === "review" ? (
          <>
            <span className="fr-decision-prompt">
              Proposed by the tool — confirm or exclude.
            </span>
            <button
              type="button"
              className="fr-btn fr-btn--exclude"
              onClick={() => onStatus("EXCLUDED")}
              disabled={locked}
            >
              Exclude
            </button>
            <button
              type="button"
              className="fr-btn fr-btn--confirm"
              onClick={() => onStatus("ACCEPTED")}
              disabled={locked}
            >
              Confirm for report
            </button>
          </>
        ) : (
          <>
            <span className="fr-included-flag">
              <span aria-hidden>✓</span> Included in report
            </span>
            <button
              type="button"
              className="fr-btn fr-btn--exclude"
              onClick={() => onStatus("EXCLUDED")}
              disabled={locked}
            >
              Exclude
            </button>
          </>
        )}
      </div>
    </article>
  );
}
