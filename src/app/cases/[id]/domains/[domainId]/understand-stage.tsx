"use client";

import type { EvidenceBucketView, EvidenceSourceType } from "@/lib/domains/types";
import { isManualNoteDraft } from "@/lib/domains/manual-note";
import { SupportingEvidencePanel } from "./supporting-evidence-panel";

export function UnderstandStage({
  domainId,
  confirmedFindingCount,
  evidenceCount,
  sourceTypes,
  evidenceBuckets,
  manualNote,
  saving,
  noteStatus,
  forceOpenRecordsNotes,
  onManualNoteChange,
  onAddNote,
  onStartNewNote,
}: {
  domainId: string;
  confirmedFindingCount: number;
  evidenceCount: number;
  sourceTypes: EvidenceSourceType[];
  evidenceBuckets: EvidenceBucketView[];
  manualNote: string;
  saving: boolean;
  noteStatus: "idle" | "saving" | "saved" | "error";
  forceOpenRecordsNotes: boolean;
  onManualNoteChange: (value: string) => void;
  onAddNote: () => void;
  onStartNewNote: () => void;
}) {
  const hasSavedRecords = evidenceBuckets.some(
    (b) =>
      b.id === "records-notes" &&
      b.items.some((item) => !isManualNoteDraft(item)),
  );

  return (
    <>
      <SupportingEvidencePanel
        domainId={domainId}
        confirmedFindingCount={confirmedFindingCount}
        evidenceCount={evidenceCount}
        sourceTypes={sourceTypes}
        evidenceBuckets={evidenceBuckets}
        forceOpenBucketIds={forceOpenRecordsNotes ? ["records-notes"] : []}
      />

      <section className="dm-workspace-section">
        <h2 className="dm-section-heading">Expand the evidence base</h2>
        <p className="dm-section-lead">
          Capture context from sessions, collateral, or observations that is not yet reflected above.
          Notes autosave as you type.
        </p>
        <textarea
          id="manual-note"
          className="assessment-notes dm-compact-textarea"
          value={manualNote}
          onChange={(e) => onManualNoteChange(e.target.value)}
          placeholder="Add a note linked to this domain…"
          aria-describedby="manual-note-status"
        />
        <div className="dm-actions dm-actions--tight">
          <button
            type="button"
            className="dm-btn"
            onClick={onAddNote}
            disabled={saving || !manualNote.trim()}
          >
            Save evidence note
          </button>
          {noteStatus === "saved" && hasSavedRecords && (
            <button
              type="button"
              className="dm-btn dm-btn--ghost"
              onClick={onStartNewNote}
              disabled={saving}
            >
              New note
            </button>
          )}
        </div>
        <p id="manual-note-status" className="dm-section-lead dm-section-lead--inset" role="status">
          {noteStatus === "saving" && "Saving evidence note…"}
          {noteStatus === "saved" && "Saved to evidence."}
          {noteStatus === "error" && "Evidence note unsaved — fix the error above and try again."}
          {noteStatus === "idle" && manualNote.trim() && "Autosaves while you type."}
        </p>
      </section>
    </>
  );
}
