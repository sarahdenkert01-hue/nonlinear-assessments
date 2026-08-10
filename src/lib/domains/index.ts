export type {
  AddManualEvidenceInput,
  DomainDetail,
  DomainEvidenceItem,
  DomainFindingRef,
  DomainSummary,
  EvidenceSourceType,
  UpdateDomainReviewInput,
} from "./types";
export {
  CLINICAL_DOMAINS,
  getAllDomains,
  getDomainById,
  getDomainsForTheme,
  sourceTypeLabel,
} from "./registry";
export {
  addManualDomainEvidence,
  countConfirmedFindings,
  ensureDomainEvidenceForEpisode,
  generateAndSaveEvidenceSummary,
  generateAndSaveSuggestedQuestions,
  getDomainDetailForEpisode,
  listDomainReportSectionsForEpisode,
  listDomainSummariesForEpisode,
  saveManualDomainEvidence,
  updateDomainReview,
} from "./repository";
export {
  MANUAL_NOTE_DRAFT_ITEM_ID,
  applyManualNoteSave,
  getManualNoteDraftExcerpt,
  isManualNoteDraft,
  type ManualNoteSaveMode,
} from "./manual-note";
export { computeEvidenceCoverage } from "./gaps";
