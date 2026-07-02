import { useState } from "react";
import type { AssessmentReportResult, ReportSource } from "../types";
import "./assessment.css";

export interface ReportPanelProps {
  /** Whether there is anything to report on (at least one included theme/finding). */
  canGenerate: boolean;
  /** Persisted episode id — enables save-backed controls (finalize / export / narrative-only). */
  sessionId?: string;
  initialReportDraft?: string | null;
  reportGeneratedAt?: string | null;
  reportFinalized?: boolean;
  /** Caller decides where the draft comes from (real episode vs dev preview). */
  onGenerate: (opts: { narrativeOnly: boolean }) => Promise<AssessmentReportResult>;
  onReportDraftChange?: (draft: string) => void;
  onReportGenerated?: (report: AssessmentReportResult) => void;
  onFinalizeReport?: () => void;
  onExportReport?: () => void;
}

function sourceLabel(source: ReportSource | null): string {
  if (source === "gemini") return "Gemini";
  if (source === "anthropic") return "Claude";
  if (source === "template") return "Narrative template";
  return "";
}

export function ReportPanel({
  canGenerate,
  sessionId,
  initialReportDraft = null,
  reportGeneratedAt = null,
  reportFinalized = false,
  onGenerate,
  onReportDraftChange,
  onReportGenerated,
  onFinalizeReport,
  onExportReport,
}: ReportPanelProps) {
  const [reportDraft, setReportDraft] = useState(initialReportDraft ?? "");
  const [reportSource, setReportSource] = useState<ReportSource | null>(null);
  const [reportGeneratedLabel, setReportGeneratedLabel] = useState(reportGeneratedAt);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportFallbackReason, setReportFallbackReason] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [narrativeOnly, setNarrativeOnly] = useState(false);

  const handleGenerateReport = async () => {
    setReportError(null);
    setReportFallbackReason(null);
    setReportLoading(true);
    try {
      const result = await onGenerate({
        narrativeOnly: narrativeOnly && Boolean(reportDraft),
      });
      setReportDraft(result.draft);
      setReportSource(result.source);
      setReportGeneratedLabel(result.generatedAt);
      setReportFallbackReason(result.fallbackReason ?? null);
      onReportDraftChange?.(result.draft);
      onReportGenerated?.(result);
    } catch (err) {
      setReportError(
        err instanceof Error
          ? err.message
          : "Report generation is not available yet.",
      );
    } finally {
      setReportLoading(false);
    }
  };

  const handleReportDraftChange = (value: string) => {
    setReportDraft(value);
    onReportDraftChange?.(value);
  };

  return (
    <>
      <div className="assessment-report-actions">
        {reportDraft && sessionId && !reportFinalized && (
          <label className="mb-3 flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={narrativeOnly}
              onChange={(e) => setNarrativeOnly(e.target.checked)}
            />
            Regenerate summary &amp; next steps only (keep theme sections)
          </label>
        )}
        <button
          type="button"
          className="assessment-btn assessment-btn--primary"
          onClick={handleGenerateReport}
          disabled={reportLoading || !canGenerate || reportFinalized}
        >
          {reportLoading
            ? "Generating… (up to ~30s with AI)"
            : reportDraft
              ? "Regenerate report"
              : "Generate report"}
        </button>
        <p className="assessment-theme-meta" style={{ marginTop: "0.75rem" }}>
          {reportLoading
            ? "If this takes more than a minute, refresh and try again. Slow AI calls time out and fall back to a template draft."
            : process.env.NODE_ENV === "development"
              ? "Uses Gemini or Claude when an API key is set; otherwise a narrative template. Add REPORT_USE_LLM=false to .env for instant drafts."
              : "Report drafting runs on a secure backend. No LLM calls are made from the browser."}
        </p>
        {reportError && <div className="assessment-alert">{reportError}</div>}
      </div>

      {reportDraft && (
        <section className="assessment-report-panel" aria-labelledby="report-heading">
          <div className="assessment-report-panel-header">
            <h2 id="report-heading" className="assessment-section-heading">
              Draft report
            </h2>
            {reportGeneratedLabel && (
              <p className="assessment-theme-meta">
                Generated {new Date(reportGeneratedLabel).toLocaleString()}
                {reportSource && ` · ${sourceLabel(reportSource)}`}
              </p>
            )}
            {reportFallbackReason && (
              <p className="assessment-theme-meta" style={{ color: "#b45309" }}>
                AI drafting failed ({reportFallbackReason}). Showing structured
                narrative template instead — check your API key and regenerate.
              </p>
            )}
          </div>
          {reportFinalized && (
            <p className="assessment-theme-meta" style={{ color: "#047857" }}>
              Report finalized — unlock by clearing finalization in session settings
              before editing.
            </p>
          )}
          <textarea
            className="assessment-report-editor"
            value={reportDraft}
            onChange={(e) => handleReportDraftChange(e.target.value)}
            aria-label="Edit draft report"
            readOnly={reportFinalized}
          />
          {sessionId && reportDraft && (
            <div className="mt-4 flex flex-wrap gap-3">
              {onExportReport && (
                <button
                  type="button"
                  className="assessment-btn assessment-btn--secondary"
                  onClick={onExportReport}
                >
                  Export as text
                </button>
              )}
              {onFinalizeReport && !reportFinalized && (
                <button
                  type="button"
                  className="assessment-btn assessment-btn--primary"
                  onClick={onFinalizeReport}
                >
                  Finalize report
                </button>
              )}
            </div>
          )}
          {!sessionId && (
            <p className="assessment-theme-meta" style={{ marginTop: "0.75rem" }}>
              Dev preview — report is not saved until you use a dashboard session.
            </p>
          )}
        </section>
      )}
    </>
  );
}
