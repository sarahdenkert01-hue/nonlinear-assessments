"use client";

import type { EvidenceBucketView, EvidenceSourceType } from "@/lib/domains/types";
import { SupportingEvidencePanel } from "./supporting-evidence-panel";

export function UnderstandStage({
  domainId,
  confirmedFindingCount,
  evidenceCount,
  sourceTypes,
  evidenceBuckets,
  manualNote,
  saving,
  onManualNoteChange,
  onAddNote,
}: {
  domainId: string;
  confirmedFindingCount: number;
  evidenceCount: number;
  sourceTypes: EvidenceSourceType[];
  evidenceBuckets: EvidenceBucketView[];
  manualNote: string;
  saving: boolean;
  onManualNoteChange: (value: string) => void;
  onAddNote: () => void;
}) {
  return (
    <>
      <SupportingEvidencePanel
        domainId={domainId}
        confirmedFindingCount={confirmedFindingCount}
        evidenceCount={evidenceCount}
        sourceTypes={sourceTypes}
        evidenceBuckets={evidenceBuckets}
      />

      <section className="dm-workspace-section">
        <h2 className="dm-section-heading">Expand the evidence base</h2>
        <p className="dm-section-lead">
          Capture context from sessions, collateral, or observations that is not yet reflected above.
        </p>
        <textarea
          id="manual-note"
          className="assessment-notes dm-compact-textarea"
          value={manualNote}
          onChange={(e) => onManualNoteChange(e.target.value)}
          placeholder="Add a note linked to this domain…"
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
        </div>
      </section>
    </>
  );
}
