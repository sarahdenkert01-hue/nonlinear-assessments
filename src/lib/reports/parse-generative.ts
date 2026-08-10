import type { GenerativeReportParts } from "./assemble";

const SUMMARY_RE =
  /<<<CLINICAL_SUMMARY>>>\s*([\s\S]*?)\s*<<<END_CLINICAL_SUMMARY>>>/i;
const NEXT_RE =
  /<<<NEXT_STEPS>>>\s*([\s\S]*?)\s*<<<END_NEXT_STEPS>>>/i;
const THEMES_RE =
  /<<<THEME_FORMULATIONS>>>\s*([\s\S]*?)\s*<<<END_THEME_FORMULATIONS>>>/i;

export type ParsedLlmReport = Partial<GenerativeReportParts> & {
  themeFormulations?: string;
};

/**
 * Parse LLM output for generative-only sections. Returns null parts when
 * markers are missing so the assembler can use deterministic fallbacks.
 */
export function parseGenerativeReportParts(text: string): ParsedLlmReport {
  const summary = text.match(SUMMARY_RE)?.[1]?.trim();
  const nextSteps = text.match(NEXT_RE)?.[1]?.trim();
  const themeFormulations = text.match(THEMES_RE)?.[1]?.trim();
  return {
    ...(summary ? { summary } : {}),
    ...(nextSteps ? { nextSteps } : {}),
    ...(themeFormulations ? { themeFormulations } : {}),
  };
}
