"use client";

import { useMemo } from "react";

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function ReportStage({
  summaryDraft,
  evidenceSummaryDraft,
  saving,
  lastEditedAt,
  onSummaryChange,
  onCopySynthesisToReport,
}: {
  summaryDraft: string | null;
  evidenceSummaryDraft: string | null;
  saving: boolean;
  lastEditedAt: string | null;
  onSummaryChange: (value: string) => void;
  onCopySynthesisToReport: () => void;
}) {
  const charCount = summaryDraft?.length ?? 0;

  const editedLabel = useMemo(() => {
    if (!lastEditedAt) return null;
    return formatRelativeTime(lastEditedAt);
  }, [lastEditedAt]);

  return (
    <div className="dm-report-workspace">
      <p className="dm-report-guidance">
        Write the language exactly as it should appear in the final report.
      </p>

      <textarea
        id="summary-draft"
        className="assessment-report-editor dm-report-editor dm-report-editor--focus"
        value={summaryDraft ?? ""}
        onChange={(e) => onSummaryChange(e.target.value)}
        placeholder="Final clinician wording…"
        disabled={saving}
        autoFocus
      />

      <div className="dm-report-meta">
        <span>{charCount.toLocaleString()} characters</span>
        {editedLabel ? <span>Last edited {editedLabel}</span> : <span>Not yet saved</span>}
      </div>

      <div className="dm-actions dm-actions--tight">
        <button
          type="button"
          className="dm-btn dm-btn--secondary"
          onClick={onCopySynthesisToReport}
          disabled={saving || !evidenceSummaryDraft?.trim()}
        >
          Copy clinical synthesis
        </button>
      </div>
    </div>
  );
}
