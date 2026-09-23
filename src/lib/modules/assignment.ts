/**
 * Assignment packages and helpers for selecting which modules to create on an episode.
 */

import {
  MODULE_KEYS,
  getDefaultClientModules,
  getModuleDefinition,
  isKnownModuleKey,
  type KnownModuleKey,
  type ModuleDefinition,
} from "./registry";

export type AssignmentPackageId = "nonlinear" | "cat-q";

export type AssignmentPackage = {
  id: AssignmentPackageId;
  title: string;
  description: string;
  detail: string;
  moduleKeys: KnownModuleKey[];
};

export const ASSIGNMENT_PACKAGES: AssignmentPackage[] = [
  {
    id: "nonlinear",
    title: "Nonlinear Assessment",
    description: "Full Nonlinear assessment experience.",
    detail: "Initial Assessment · Life Map · Guided Reflection",
    moduleKeys: [
      MODULE_KEYS.SCREENER,
      MODULE_KEYS.LIFE_MAP,
      MODULE_KEYS.GUIDED_REFLECTION,
    ],
  },
  {
    id: "cat-q",
    title: "CAT-Q",
    description: "Camouflaging Autistic Traits Questionnaire",
    detail: "25 items · Camouflaging & masking",
    moduleKeys: [MODULE_KEYS.CAT_Q],
  },
];

export function getAssignmentPackage(
  id: string,
): AssignmentPackage | undefined {
  return ASSIGNMENT_PACKAGES.find((p) => p.id === id);
}

export function isAssignmentPackageId(id: unknown): id is AssignmentPackageId {
  return id === "nonlinear" || id === "cat-q";
}

/** Resolve module definitions for a package. Defaults to Nonlinear. */
export function getModulesForPackage(
  packageId: AssignmentPackageId = "nonlinear",
): ModuleDefinition[] {
  if (packageId === "nonlinear") {
    return getDefaultClientModules();
  }
  const pkg = getAssignmentPackage(packageId);
  if (!pkg) return getDefaultClientModules();
  return pkg.moduleKeys
    .map((key) => getModuleDefinition(key))
    .filter((d): d is ModuleDefinition => !!d)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Which assigned module should carry the intake token.
 * Prefer the Nonlinear screener when present; otherwise the first assigned module.
 */
export function resolveTokenBearerModuleKey(moduleKeys: string[]): string | null {
  if (moduleKeys.length === 0) return null;
  if (moduleKeys.includes(MODULE_KEYS.SCREENER)) return MODULE_KEYS.SCREENER;
  return moduleKeys[0] ?? null;
}

/**
 * Modules to add to an episode that are not already present.
 * Unknown keys are ignored. Never returns duplicates of existing keys.
 */
export function filterModuleKeysToAdd(
  existingKeys: Iterable<string>,
  requestedKeys: string[],
): KnownModuleKey[] {
  const existing = new Set(existingKeys);
  const toAdd: KnownModuleKey[] = [];
  const seen = new Set<string>();

  for (const key of requestedKeys) {
    if (!isKnownModuleKey(key)) continue;
    if (existing.has(key) || seen.has(key)) continue;
    seen.add(key);
    toAdd.push(key);
  }
  return toAdd;
}

/**
 * Whether submitting this module should move the episode DRAFT → SUBMITTED.
 * Preserves historical Nonlinear behavior: screener submit unlocks.
 * CAT-Q-only (no screener on the episode) unlocks on CAT-Q submit.
 */
export function shouldUnlockEpisodeOnModuleSubmit(
  moduleKey: string,
  assignedModuleKeys: string[],
): boolean {
  if (moduleKey === MODULE_KEYS.SCREENER) return true;
  const hasScreener = assignedModuleKeys.includes(MODULE_KEYS.SCREENER);
  if (!hasScreener && moduleKey === MODULE_KEYS.CAT_Q) return true;
  return false;
}

/**
 * Whether a module counts toward journey "all required submitted" for this episode.
 *
 * Nonlinear package modules use registry `required` (unchanged).
 * CAT-Q is required only when it is the primary assignment (no Nonlinear screener
 * on the episode). When CAT-Q is added beside a Nonlinear screener, it is
 * supplemental: tracked independently, but it does not gate package completion.
 */
export function isModuleRequiredForEpisode(
  moduleKey: string,
  assignedModuleKeys: string[],
): boolean {
  if (moduleKey === MODULE_KEYS.CAT_Q) {
    return !assignedModuleKeys.includes(MODULE_KEYS.SCREENER);
  }
  return getModuleDefinition(moduleKey)?.required ?? true;
}

/**
 * Journey completion from assigned module statuses.
 * Uses contextual required rules (CAT-Q supplemental vs primary).
 */
export function areRequiredModulesSubmitted(
  modules: ReadonlyArray<{ moduleKey: string; status: string }>,
): boolean {
  const assignedKeys = modules.map((m) => m.moduleKey);
  const required = modules.filter((m) =>
    isModuleRequiredForEpisode(m.moduleKey, assignedKeys),
  );
  if (required.length === 0) return false;
  return required.every(
    (m) => m.status === "SUBMITTED" || m.status === "COMPLETED",
  );
}

/** Optional structured measures a clinician can add to an existing episode. */
export function getAddableStructuredMeasureKeys(): KnownModuleKey[] {
  return [MODULE_KEYS.CAT_Q];
}
