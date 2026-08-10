import type { DomainEvidenceItem } from "./types";

/** Stable itemId for the in-progress clinician draft note (one per domain). */
export const MANUAL_NOTE_DRAFT_ITEM_ID = "__manual_note_draft__";

export type ManualNoteSaveMode = "draft" | "finalize";

export function isManualNoteDraft(item: {
  sourceType: string;
  itemId?: string | null;
}): boolean {
  return item.sourceType === "MANUAL_NOTE" && item.itemId === MANUAL_NOTE_DRAFT_ITEM_ID;
}

export function getManualNoteDraftExcerpt(
  evidence: Pick<DomainEvidenceItem, "sourceType" | "itemId" | "excerpt">[],
): string {
  const draft = evidence.find(isManualNoteDraft);
  return draft?.excerpt?.trim() ?? "";
}

export interface ManualNoteRow {
  id: string;
  sourceType: "MANUAL_NOTE";
  itemId: string | null;
  excerpt: string;
}

/**
 * Pure upsert for the domain's single draft MANUAL_NOTE row.
 * - draft: create/update the draft row (itemId = MANUAL_NOTE_DRAFT_ITEM_ID)
 * - finalize: promote draft to a saved note (itemId cleared) so the next edit can start a new draft
 * Empty excerpt in draft mode removes the draft row; finalize with empty is a no-op.
 */
export function applyManualNoteSave(
  rows: ManualNoteRow[],
  excerpt: string,
  mode: ManualNoteSaveMode,
  newId: () => string = () => `note_${rows.length + 1}`,
): ManualNoteRow[] {
  const text = excerpt.trim();
  const others = rows.filter((r) => !isManualNoteDraft(r));
  const draft = rows.find(isManualNoteDraft);

  if (mode === "draft") {
    if (!text) {
      return others;
    }
    if (draft) {
      return [...others, { ...draft, excerpt: text }];
    }
    return [
      ...others,
      {
        id: newId(),
        sourceType: "MANUAL_NOTE",
        itemId: MANUAL_NOTE_DRAFT_ITEM_ID,
        excerpt: text,
      },
    ];
  }

  // finalize
  if (!text) return rows;
  if (draft) {
    return [...others, { ...draft, itemId: null, excerpt: text }];
  }
  return [
    ...others,
    {
      id: newId(),
      sourceType: "MANUAL_NOTE",
      itemId: null,
      excerpt: text,
    },
  ];
}

export function countManualNotes(rows: ManualNoteRow[]): number {
  return rows.filter((r) => r.sourceType === "MANUAL_NOTE").length;
}
