export {
  MODULE_KEYS,
  MODULE_REGISTRY,
  getDefaultClientModules,
  getModuleDefinition,
  isKnownModuleKey,
  type KnownModuleKey,
  type ModuleDefinition,
  type ModuleRenderer,
} from "./registry";
export {
  GUIDED_REFLECTION_SECTIONS,
  parseGuidedReflectionData,
  validateGuidedReflectionData,
  type GuidedReflectionSection,
} from "./guided-reflection";
export {
  LIFE_MAP_STAGES,
  LIFE_MAP_TAGS,
  createEmptyLifeMapEntry,
  parseLifeMapData,
  validateLifeMapData,
} from "./life-map";
export { buildExplorationReportContext } from "./exploration-context";
export {
  MODULE_PAYLOAD_LIMITS,
  assertKnownModuleKey,
  validateModulePayload,
  type ModulePayloadValidation,
} from "./validate";
export type {
  ClientAssessmentEpisode,
  ClientModuleRecord,
  ExplorationReportContext,
  GuidedReflectionData,
  GuidedReflectionSectionKey,
  LifeMapData,
  LifeMapEntry,
  ModuleStatus,
} from "./types";

