/**
 * Central registry of client-facing assessment modules.
 * Add new modules here — the journey page and episode creation read from this list.
 */

export type ModuleRenderer =
  | "assessment-form"
  | "developmental-life-map"
  | "guided-reflection";

export interface ModuleDefinition {
  moduleKey: string;
  moduleVersion: string;
  title: string;
  description: string;
  renderer: ModuleRenderer;
  displayOrder: number;
  estimatedMinutes: number;
  required: boolean;
}

export const MODULE_KEYS = {
  SCREENER: "nonlinear-screener",
  LIFE_MAP: "developmental-life-map",
  GUIDED_REFLECTION: "guided-reflection",
} as const;

export type KnownModuleKey = (typeof MODULE_KEYS)[keyof typeof MODULE_KEYS];

export const MODULE_REGISTRY: ModuleDefinition[] = [
  {
    moduleKey: MODULE_KEYS.SCREENER,
    moduleVersion: "1",
    title: "Initial Assessment",
    description:
      "A structured screener that helps us understand patterns in attention, sensory experience, emotion, and daily life.",
    renderer: "assessment-form",
    displayOrder: 1,
    estimatedMinutes: 20,
    required: true,
  },
  {
    moduleKey: MODULE_KEYS.LIFE_MAP,
    moduleVersion: "1",
    title: "Developmental Life Map",
    description:
      "A timeline of meaningful periods in your life — what was happening, what helped, and what was hard.",
    renderer: "developmental-life-map",
    displayOrder: 2,
    estimatedMinutes: 25,
    required: true,
  },
  {
    moduleKey: MODULE_KEYS.GUIDED_REFLECTION,
    moduleVersion: "1",
    title: "Guided Reflection",
    description:
      "Open-ended prompts to share patterns, adaptations, and what you hope this assessment helps clarify.",
    renderer: "guided-reflection",
    displayOrder: 3,
    estimatedMinutes: 15,
    required: true,
  },
];

export function getModuleDefinition(moduleKey: string): ModuleDefinition | undefined {
  return MODULE_REGISTRY.find((m) => m.moduleKey === moduleKey);
}

export function getDefaultClientModules(): ModuleDefinition[] {
  return [...MODULE_REGISTRY].sort((a, b) => a.displayOrder - b.displayOrder);
}

export function isKnownModuleKey(moduleKey: string): moduleKey is KnownModuleKey {
  return MODULE_REGISTRY.some((m) => m.moduleKey === moduleKey);
}
