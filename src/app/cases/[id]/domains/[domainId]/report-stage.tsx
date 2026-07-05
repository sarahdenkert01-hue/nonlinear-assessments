"use client";

export function ReportStage({
  summaryDraft,
  evidenceSummaryDraft,
  saving,
  onSummaryChange,
  onCopySynthesisToReport,
}: {
  summaryDraft: string | null;
  evidenceSummaryDraft: string | null;
  saving: boolean;
  onSummaryChange: (value: string) => void;
  onCopySynthesisToReport: () => void;
}) {
  return (
    <section className="dm-workspace-section dm-workspace-section--hero dm-report-panel--final">
      <h2 className="dm-section-heading">How should I communicate this?</h2>
      <p className="dm-section-lead dm-section-lead--emphasis">
        Final clinician wording — the language that will appear in the final report.
      </p>

      <textarea
        id="summary-draft"
        className="assessment-report-editor dm-report-editor"
        value={summaryDraft ?? ""}
        onChange={(e) => onSummaryChange(e.target.value)}
        placeholder="Write how this domain should read in the report…"
        disabled={saving}
      />

      <div className="dm-actions dm-actions--tight">
        <button
          type="button"
          className="dm-btn dm-btn--primary"
          onClick={onCopySynthesisToReport}
          disabled={saving || !evidenceSummaryDraft?.trim()}
        >
          Copy clinical synthesis
        </button>
      </div>

      {summaryDraft?.trim() ? (
        <div className="dm-report-preview" aria-label="Report preview">
          <p className="dm-report-preview-label">Preview</p>
          <div className="dm-report-preview-body">{summaryDraft}</div>
        </div>
      ) : null}
    </section>
  );
}
