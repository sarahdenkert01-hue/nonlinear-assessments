import { MODULE_KEYS, isKnownModuleKey } from "./registry";
import {
  GUIDED_REFLECTION_SECTIONS,
  parseGuidedReflectionData,
} from "./guided-reflection";
import { LIFE_MAP_TAGS, parseLifeMapData } from "./life-map";
import type { GuidedReflectionData, LifeMapData } from "./types";

/** Hard caps to bound storage and CPU for client autosave/submit bodies. */
export const MODULE_PAYLOAD_LIMITS = {
  maxJsonBytes: 200_000,
  screener: {
    maxKeys: 80,
    maxValueChars: 4_000,
  },
  guidedReflection: {
    maxSectionChars: 10_000,
  },
  lifeMap: {
    maxEntries: 40,
    maxFieldChars: 5_000,
    maxTitleChars: 200,
    maxTagsPerEntry: 15,
    maxTagChars: 60,
  },
} as const;

const ALLOWED_LIFE_MAP_TAGS = new Set<string>(LIFE_MAP_TAGS);
const REFLECTION_KEYS = new Set(
  GUIDED_REFLECTION_SECTIONS.map((s) => s.key),
);

export type ModulePayloadValidation =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string };

function approximateJsonBytes(value: unknown): number {
  try {
    return JSON.stringify(value)?.length ?? Number.MAX_SAFE_INTEGER;
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function truncateCheck(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length <= max;
}

/** Reject unknown module keys before any DB lookup. */
export function assertKnownModuleKey(moduleKey: string): boolean {
  return isKnownModuleKey(moduleKey);
}

export function validateModulePayload(
  moduleKey: string,
  raw: unknown,
): ModulePayloadValidation {
  if (!assertKnownModuleKey(moduleKey)) {
    return { ok: false, error: "Unknown module" };
  }
  if (!isPlainObject(raw)) {
    return { ok: false, error: "data object is required" };
  }
  if (approximateJsonBytes(raw) > MODULE_PAYLOAD_LIMITS.maxJsonBytes) {
    return { ok: false, error: "Payload too large" };
  }

  if (moduleKey === MODULE_KEYS.SCREENER) {
    return validateScreenerPayload(raw);
  }
  if (moduleKey === MODULE_KEYS.GUIDED_REFLECTION) {
    return validateGuidedReflectionPayload(raw);
  }
  if (moduleKey === MODULE_KEYS.LIFE_MAP) {
    return validateLifeMapPayload(raw);
  }
  return { ok: false, error: "Unknown module" };
}

function validateScreenerPayload(raw: Record<string, unknown>): ModulePayloadValidation {
  const keys = Object.keys(raw);
  if (keys.length > MODULE_PAYLOAD_LIMITS.screener.maxKeys) {
    return { ok: false, error: "Too many answer fields" };
  }
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof key !== "string" || key.length > 64) {
      return { ok: false, error: "Invalid answer key" };
    }
    if (value === undefined || value === null) continue;
    if (!truncateCheck(value, MODULE_PAYLOAD_LIMITS.screener.maxValueChars)) {
      return { ok: false, error: "Answer value too long" };
    }
    data[key] = value;
  }
  return { ok: true, data };
}

function validateGuidedReflectionPayload(
  raw: Record<string, unknown>,
): ModulePayloadValidation {
  for (const key of Object.keys(raw)) {
    if (!REFLECTION_KEYS.has(key as keyof GuidedReflectionData)) {
      return { ok: false, error: `Unknown reflection section: ${key}` };
    }
  }
  const parsed = parseGuidedReflectionData(raw);
  for (const [key, value] of Object.entries(parsed)) {
    if (
      typeof value === "string" &&
      value.length > MODULE_PAYLOAD_LIMITS.guidedReflection.maxSectionChars
    ) {
      return { ok: false, error: `Response too long in section ${key}` };
    }
  }
  return { ok: true, data: parsed as Record<string, unknown> };
}

function validateLifeMapPayload(raw: Record<string, unknown>): ModulePayloadValidation {
  const candidate = Array.isArray(raw.entries) ? raw : null;
  if (!candidate) {
    return { ok: false, error: "Life map must include an entries array" };
  }
  // Reject unexpected top-level keys.
  const extraKeys = Object.keys(candidate).filter((k) => k !== "entries");
  if (extraKeys.length > 0) {
    return { ok: false, error: "Unexpected life map fields" };
  }

  const parsed: LifeMapData = parseLifeMapData(candidate);
  if (parsed.entries.length > MODULE_PAYLOAD_LIMITS.lifeMap.maxEntries) {
    return { ok: false, error: "Too many timeline entries" };
  }

  const limits = MODULE_PAYLOAD_LIMITS.lifeMap;
  for (const entry of parsed.entries) {
    if (entry.id.length > 80) {
      return { ok: false, error: "Invalid entry id" };
    }
    if (entry.lifeStage.length > limits.maxTitleChars) {
      return { ok: false, error: "Life stage too long" };
    }
    if (entry.title.length > limits.maxTitleChars) {
      return { ok: false, error: "Title too long" };
    }
    for (const field of [
      "description",
      "supportive",
      "difficult",
      "adapted",
      "affectsNow",
    ] as const) {
      if (entry[field].length > limits.maxFieldChars) {
        return { ok: false, error: `Field too long: ${field}` };
      }
    }
    if (entry.tags.length > limits.maxTagsPerEntry) {
      return { ok: false, error: "Too many tags on an entry" };
    }
    for (const tag of entry.tags) {
      if (tag.length > limits.maxTagChars) {
        return { ok: false, error: "Tag too long" };
      }
      if (!ALLOWED_LIFE_MAP_TAGS.has(tag)) {
        return { ok: false, error: `Unknown tag: ${tag}` };
      }
    }
  }

  return { ok: true, data: { entries: parsed.entries } };
}
