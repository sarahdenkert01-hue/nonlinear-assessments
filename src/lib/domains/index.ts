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
  listDomainSummariesForEpisode,
  updateDomainReview,
} from "./repository";
export { computeEvidenceCoverage } from "./gaps";
