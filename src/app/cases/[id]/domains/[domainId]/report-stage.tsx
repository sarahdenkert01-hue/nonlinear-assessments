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
    <section className="dm-panel dm-section dm-report-panel dm-report-panel--final">
      <p className="dm-section-step">Report language</p>
      <h2 className="dm-panel-title dm-panel-title--lg">Final clinician wording</h2>
      <p className="dm-panel-hint dm-panel-hint--tight">
        Source of truth for the report — never auto-filled.
      </p>

      <textarea
        id="summary-draft"
        className="assessment-report-editor dm-report-editor"
        value={summaryDraft ?? ""}
        onChange={(e) => onSummaryChange(e.target.value)}
        placeholder="Write the domain summary as it should appear in the report…"
        disabled={saving}
      />

      <div className="dm-actions">
        <button
          type="button"
          className="dm-btn dm-btn--primary"
          onClick={onCopySynthesisToReport}
          disabled={saving || !evidenceSummaryDraft?.trim()}
        >
          Copy clinical synthesis
        </button>
        {formulationSections.map((section) => (
          <button
            key={section.label}
            type="button"
            className="dm-btn"
            onClick={() => onCopyFormulationSectionToReport(section.text!)}
            disabled={saving}
          >
            Copy {section.label.toLowerCase()}
          </button>
        ))}
      </div>
    </section>
  );
}
