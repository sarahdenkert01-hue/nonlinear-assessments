import { useMemo, useState } from "react";
import {
  requestDevPreviewReport,
  requestSessionReport,
} from "../lib/report-api";
import {
  computeThemeScores,
  countAnsweredQuestions,
  getIncludedThemes,
  getScorableQuestions,
  getTriggeredQuestionsForTheme,
  resolveThemesWithOverrides,
} from "../lib/scoring";
import type { AssessmentReportResult, ReportSource } from "../types";
import type {
  AssessmentAnswers,
  ClinicianOverrides,
  ClinicianThemeOverride,
  ResolvedTheme,
  ThemeCategory,
} from "../types";
import "./assessment.css";

export interface AssessmentReviewProps {
  answers: AssessmentAnswers;
  initialOverrides?: ClinicianOverrides;
  onOverridesChange?: (overrides: ClinicianOverrides) => void;
  initialNotes?: string;
  onNotesChange?: (notes: string) => void;
  clientName?: string;
  /** Persisted session — enables server report generation and draft saving. */
  sessionId?: string;
  initialReportDraft?: string | null;
  reportGeneratedAt?: string | null;
  onReportDraftChange?: (draft: string) => void;
  onReportGenerated?: (report: AssessmentReportResult) => void;
  reportFinalized?: boolean;
  onFinalizeReport?: () => void;
  onExportReport?: () => void;
}

function categoryBadgeClass(category: ThemeCategory): string {
  if (category === "ADHD") return "assessment-badge assessment-badge--adhd";
  if (category === "Autism") return "assessment-badge assessment-badge--autism";
  return "assessment-badge assessment-badge--both";
}

function triggerLabel(theme: ResolvedTheme): string {
  if (theme.triggerMode === "single") return "1 endorsement needed";
  return "2+ endorsements needed (convergence)";
}

function ThemeCard({
  theme,
  override,
  onOverrideChange,
  onSelect,
  selected,
}: {
  theme: ResolvedTheme;
  override: ClinicianThemeOverride;
  onOverrideChange: (value: ClinicianThemeOverride) => void;
  onSelect: () => void;
  selected: boolean;
}) {
  const barWidth =
    theme.total > 0 ? `${Math.round((theme.hits / theme.total) * 100)}%` : "0%";

  return (
    <article
      className={`assessment-theme-card${theme.included ? " assessment-theme-card--included" : " assessment-theme-card--excluded"}`}
      style={selected ? { outline: "2px solid #93c5fd" } : undefined}
    >
      <div className="assessment-theme-card-header">
        <span className={categoryBadgeClass(theme.category)}>{theme.category}</span>
        {theme.flagged && override === null && (
          <span className="assessment-badge assessment-badge--flagged">Suggested</span>
        )}
        {theme.source === "clinician-include" && (
          <span className="assessment-badge assessment-badge--both">Included</span>
        )}
        {theme.source === "clinician-exclude" && (
          <span className="assessment-badge assessment-badge--flagged">Excluded</span>
        )}
      </div>

      <button
        type="button"
        onClick={onSelect}
        style={{
          all: "unset",
          cursor: "pointer",
          display: "block",
          width: "100%",
        }}
      >
        <h3 className="assessment-theme-label">{theme.label}</h3>
        <div className="assessment-theme-bar" aria-hidden>
          <div className="assessment-theme-bar-fill" style={{ width: barWidth }} />
        </div>
        <p className="assessment-theme-meta">
          {theme.hits} of {theme.total} indicators endorsed · {triggerLabel(theme)}
        </p>
      </button>

      <div className="assessment-override-row" role="group" aria-label="Override theme">
        <button
          type="button"
          className={`assessment-override-btn assessment-override-btn--auto${override === null ? " assessment-override-btn--active" : ""}`}
          onClick={() => onOverrideChange(null)}
        >
          Auto
        </button>
        <button
          type="button"
          className={`assessment-override-btn assessment-override-btn--include${override === "include" ? " assessment-override-btn--active" : ""}`}
          onClick={() => onOverrideChange("include")}
        >
          Include
        </button>
        <button
          type="button"
          className={`assessment-override-btn assessment-override-btn--exclude${override === "exclude" ? " assessment-override-btn--active" : ""}`}
          onClick={() => onOverrideChange("exclude")}
        >
          Exclude
        </button>
      </div>
    </article>
  );
}

export function AssessmentReview({
  answers,
  initialOverrides = {},
  onOverridesChange,
  initialNotes = "",
  onNotesChange,
  clientName,
  sessionId,
  initialReportDraft = null,
  reportGeneratedAt = null,
  onReportDraftChange,
  onReportGenerated,
  reportFinalized = false,
  onFinalizeReport,
  onExportReport,
}: AssessmentReviewProps) {
  const [overrides, setOverrides] = useState<ClinicianOverrides>(initialOverrides);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [clinicianNotes, setClinicianNotes] = useState(initialNotes);
  const [reportDraft, setReportDraft] = useState(initialReportDraft ?? "");
  const [reportSource, setReportSource] = useState<ReportSource | null>(null);
  const [reportGeneratedLabel, setReportGeneratedLabel] = useState(
    reportGeneratedAt,
  );
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportFallbackReason, setReportFallbackReason] = useState<string | null>(
    null,
  );
  const [reportLoading, setReportLoading] = useState(false);
  const [narrativeOnly, setNarrativeOnly] = useState(false);

  const scores = useMemo(() => computeThemeScores(answers), [answers]);
  const resolved = useMemo(
    () => resolveThemesWithOverrides(scores, overrides),
    [scores, overrides],
  );
  const included = useMemo(() => getIncludedThemes(resolved), [resolved]);

  const answeredCount = countAnsweredQuestions(answers);
  const totalScorable = getScorableQuestions().length;
  const suggestedCount = scores.filter((t) => t.flagged).length;

  const updateOverride = (themeId: string, value: ClinicianThemeOverride) => {
    setOverrides((prev) => {
      const next = { ...prev, [themeId]: value };
      onOverridesChange?.(next);
      return next;
    });
  };

  const selectedTheme = selectedThemeId
    ? resolved.find((t) => t.id === selectedThemeId)
    : null;

  const triggeredQuestions =
    selectedThemeId != null
      ? getTriggeredQuestionsForTheme(selectedThemeId, answers)
      : [];

  const handleGenerateReport = async () => {
    setReportError(null);
    setReportFallbackReason(null);
    setReportLoading(true);
    try {
      const notes = clinicianNotes.trim() || undefined;
      const result = sessionId
        ? await requestSessionReport(sessionId, {
            overrides,
            clinicianNotes: notes,
            narrativeOnly: narrativeOnly && Boolean(reportDraft),
          })
        : await requestDevPreviewReport({
            answers,
            overrides,
            clinicianNotes: notes,
            clientName,
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

  const sortedThemes = [...resolved].sort((a, b) => {
    if (a.included !== b.included) return a.included ? -1 : 1;
    if (a.flagged !== b.flagged) return a.flagged ? -1 : 1;
    return b.hits - a.hits;
  });

  return (
    <div className="assessment-root">
      <div className="assessment-shell assessment-shell--wide">
        <header className="assessment-header">
          <h1 className="assessment-title">Assessment review</h1>
          <p className="assessment-subtitle">
            {clientName
              ? `Review suggested clinical themes for ${clientName}.`
              : "Review algorithmically suggested themes and adjust before generating a report."}
          </p>
        </header>

        <div className="assessment-review-summary">
          <span>
            <strong>{answeredCount}</strong> of {totalScorable} scorable questions answered
          </span>
          <span>
            <strong>{suggestedCount}</strong> themes suggested by algorithm
          </span>
          <span>
            <strong>{included.length}</strong> themes included for report
          </span>
        </div>

        <section aria-labelledby="themes-heading">
          <h2
            id="themes-heading"
            className="assessment-section-heading"
            style={{ marginBottom: "1rem" }}
          >
            Clinical themes
          </h2>
          <p className="assessment-subtitle" style={{ marginBottom: "1.25rem" }}>
            High-sensitivity themes trigger from a single endorsed item. Convergence
            themes require two or more endorsed mapped items.
          </p>

          <div className="assessment-theme-grid">
            {sortedThemes.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                override={overrides[theme.id] ?? null}
                onOverrideChange={(v) => updateOverride(theme.id, v)}
                onSelect={() => setSelectedThemeId(theme.id)}
                selected={selectedThemeId === theme.id}
              />
            ))}
          </div>
        </section>

        {selectedTheme && (
          <div className="assessment-detail-panel">
            <h3>Endorsed items — {selectedTheme.label}</h3>
            {triggeredQuestions.length === 0 ? (
              <p className="assessment-theme-meta">
                No scorable items endorsed for this theme.
              </p>
            ) : (
              <ul className="assessment-detail-list">
                {triggeredQuestions.map((q) => (
                  <li key={q.id}>
                    <strong>{q.id}</strong> — {q.text}
                    <br />
                    <span style={{ color: "#9ca3af" }}>Answer: {answers[q.id]}</span>
                  </li>
                ))}
              </ul>
            )}
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
          value={clinicianNotes}
          onChange={(e) => {
            setClinicianNotes(e.target.value);
            onNotesChange?.(e.target.value);
          }}
          placeholder="Clinical observations, context, or rationale for overrides..."
        />

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
            disabled={reportLoading || included.length === 0 || reportFinalized}
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
                  {reportSource &&
                    ` · ${reportSource === "gemini" ? "Gemini" : reportSource === "anthropic" ? "Claude" : "Narrative template"}`}
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
      </div>
    </div>
  );
}
