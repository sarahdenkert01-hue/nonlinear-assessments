import type { LifeMapData, LifeMapEntry } from "./types";

export const LIFE_MAP_STAGES = [
  "Early childhood",
  "Elementary years",
  "Adolescence",
  "Young adulthood",
  "Adulthood",
  "Present day",
  "Other / not sure",
] as const;

export const LIFE_MAP_TAGS = [
  "Family",
  "School",
  "Friendships",
  "Sensory experiences",
  "Emotions",
  "Routines and change",
  "Interests",
  "Executive functioning",
  "Health",
  "Identity",
  "Work",
  "Relationships",
  "Trauma or major stress",
] as const;

export function createEmptyLifeMapEntry(partial?: Partial<LifeMapEntry>): LifeMapEntry {
  return {
    id: partial?.id ?? crypto.randomUUID(),
    lifeStage: partial?.lifeStage ?? "",
    title: partial?.title ?? "",
    description: partial?.description ?? "",
    supportive: partial?.supportive ?? "",
    difficult: partial?.difficult ?? "",
    adapted: partial?.adapted ?? "",
    affectsNow: partial?.affectsNow ?? "",
    tags: partial?.tags ?? [],
    sortOrder: partial?.sortOrder ?? 0,
  };
}

export function parseLifeMapData(raw: unknown): LifeMapData {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { entries: [] };
  }
  const entriesRaw = (raw as { entries?: unknown }).entries;
  if (!Array.isArray(entriesRaw)) return { entries: [] };

  const entries: LifeMapEntry[] = entriesRaw
    .filter((e): e is Record<string, unknown> => !!e && typeof e === "object" && !Array.isArray(e))
    .map((e, index) => ({
      id: typeof e.id === "string" && e.id ? e.id : `entry-${index}`,
      lifeStage: typeof e.lifeStage === "string" ? e.lifeStage : "",
      title: typeof e.title === "string" ? e.title : "",
      description: typeof e.description === "string" ? e.description : "",
      supportive: typeof e.supportive === "string" ? e.supportive : "",
      difficult: typeof e.difficult === "string" ? e.difficult : "",
      adapted: typeof e.adapted === "string" ? e.adapted : "",
      affectsNow: typeof e.affectsNow === "string" ? e.affectsNow : "",
      tags: Array.isArray(e.tags)
        ? e.tags.filter((t): t is string => typeof t === "string")
        : [],
      sortOrder: typeof e.sortOrder === "number" ? e.sortOrder : index,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return { entries };
}

export function validateLifeMapData(raw: unknown): LifeMapData | null {
  try {
    return parseLifeMapData(raw);
  } catch {
    return null;
  }
}
