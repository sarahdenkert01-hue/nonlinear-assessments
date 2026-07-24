import { MODULE_KEYS } from "./registry";
import { parseGuidedReflectionData } from "./guided-reflection";
import { parseLifeMapData } from "./life-map";
import type { ClientModuleRecord, ExplorationReportContext } from "./types";

/**
 * Normalize submitted exploration modules into a structured shape for future report use.
 * Content is client self-report — not verified clinical conclusions.
 */
export function buildExplorationReportContext(
  modules: Pick<ClientModuleRecord, "moduleKey" | "status" | "data">[],
): ExplorationReportContext {
  const context: ExplorationReportContext = {};

  const lifeMap = modules.find(
    (m) =>
      m.moduleKey === MODULE_KEYS.LIFE_MAP &&
      (m.status === "SUBMITTED" || m.status === "COMPLETED"),
  );
  if (lifeMap) {
    const parsed = parseLifeMapData(lifeMap.data);
    context.developmentalLifeMap = { entries: parsed.entries };
  }

  const reflection = modules.find(
    (m) =>
      m.moduleKey === MODULE_KEYS.GUIDED_REFLECTION &&
      (m.status === "SUBMITTED" || m.status === "COMPLETED"),
  );
  if (reflection) {
    const sections = parseGuidedReflectionData(reflection.data);
    const cleaned: Record<string, string> = {};
    for (const [key, value] of Object.entries(sections)) {
      if (typeof value === "string" && value.trim()) cleaned[key] = value;
    }
    context.guidedReflection = { sections: cleaned };
  }

  return context;
}
