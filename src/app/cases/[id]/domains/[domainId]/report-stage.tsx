"use client";

import type { ClinicalFormulationDraft } from "@/lib/domains/types";

export function ReportStage({
  summaryDraft,
  evidenceSummaryDraft,
  clinicalFormulation,
  saving,
  onSummaryChange,
  onCopySynthesisToReport,
  onCopyFormulationSectionToReport,
}: {
  summaryDraft: string | null;
  evidenceSummaryDraft: string | null;
  clinicalFormulation: ClinicalFormulationDraft;
  saving: boolean;
  onSummaryChange: (value: string) => void;
  onCopySynthesisToReport: () => void;
  onCopyFormulationSectionToReport: (text: string) => void;
}) {
  const formulationSections = [
    { label: "Core understanding", text: clinicalFormulation.coreUnderstanding },
    { label: "Functional impact", text: clinicalFormulation.functionalImpact },
    { label: "Strengths & strategies", text: clinicalFormulation.strengthsAdaptiveStrategies },
  ].filter((s) => s.text?.trim());

  return (
    <section className="dm-panel dm-section dm-report-panel">
      <p className="dm-question-label">6. What belongs in the report?</p>
      <h2 className="dm-panel-title">Report draft</h2>
      <p className="dm-panel-hint">How should I communicate this? Clinician-owned — never auto-filled.</p>

      <textarea
        id="summary-draft"
        className="assessment-report-editor"
        style={{ minHeight: "12rem" }}
        value={summaryDraft ?? ""}
        onChange={(e) => onSummaryChange(e.target.value)}
        placeholder="Editable domain summary for the report…"
        disabled={saving}
      />

      <div className="dm-actions">
        <button
          type="button"
          className="dm-btn dm-btn--primary"
          onClick={onCopySynthesisToReport}
          disabled={saving || !evidenceSummaryDraft?.trim()}
        >
          Copy clinical synthesis → report draft
        </button>
        {formulationSections.map((section) => (
          <button
            key={section.label}
            type="button"
            className="dm-btn"
            onClick={() => onCopyFormulationSectionToReport(section.text!)}
            disabled={saving}
          >
            Copy {section.label.toLowerCase()} → report
          </button>
        ))}
      </div>

      {summaryDraft?.trim() ? (
        <div className="dm-report-preview" aria-label="Report preview">
          <div className="dm-report-preview-label">Preview</div>
          <div className="dm-report-preview-body">{summaryDraft}</div>
        </div>
      ) : null}
    </section>
  );
}
