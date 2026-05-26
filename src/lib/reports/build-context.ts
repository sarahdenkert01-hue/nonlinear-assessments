import {
  computeThemeScores,
  getIncludedThemes,
  getTriggeredQuestionsForTheme,
  resolveThemesWithOverrides,
} from "@/features/assessments/lib/scoring";
import type { ReportGenerationInput } from "./types";

export interface ThemeReportContext {
  id: string;
  label: string;
  category: string;
  source: string;
  hits: number;
  total: number;
  endorsedItems: { id: string; text: string; answer: string }[];
}

export interface ReportContext {
  clientName: string;
  clinicianNotes?: string;
  themes: ThemeReportContext[];
}

/** Build structured context for template or LLM report generation. */
export function buildReportContext(input: ReportGenerationInput): ReportContext {
  const scores = computeThemeScores(input.answers);
  const resolved = resolveThemesWithOverrides(scores, input.overrides);
  const included =
    input.resolvedThemes.length > 0
      ? input.resolvedThemes
      : getIncludedThemes(resolved);

  const themes: ThemeReportContext[] = included.map((theme) => ({
    id: theme.id,
    label: theme.label,
    category: theme.category,
    source: theme.source,
    hits: theme.hits,
    total: theme.total,
    endorsedItems: getTriggeredQuestionsForTheme(theme.id, input.answers).map(
      (q) => ({
        id: q.id,
        text: q.text,
        answer: input.answers[q.id] ?? "",
      }),
    ),
  }));

  return {
    clientName: input.clientName?.trim() || "Client",
    clinicianNotes: input.clinicianNotes?.trim() || undefined,
    themes,
  };
}
