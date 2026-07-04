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
  getDomainDetailForEpisode,
  listDomainSummariesForEpisode,
  updateDomainReview,
} from "./repository";
