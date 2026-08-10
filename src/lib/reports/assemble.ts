import type { ReportContext } from "./build-context";
import { formatDomainReportSections } from "./domain-sections";
import { buildNarrativeSections, themeNarrative } from "./narrative";
import {
  extractMissingThemeIds,
  ensureThemeCoverage,
} from "./theme-coverage";

export interface GenerativeReportParts {
  summary: string;
  nextSteps: string;
  /** Only used when no clinician domain summaries exist. */
  themeFormulations?: string;
}

const DEFAULT_NEXT_STEPS = `1. **Clinical interview** — Clarify onset, pervasiveness across settings, compensatory strategies, and impact on relationships, work/school, and self-care.
2. **Collateral** — When appropriate, gather developmental history and observer report (partner, parent, employer) for domains with limited collateral.
3. **Rule-outs** — Screen for sleep disruption, mood/anxiety disorders, trauma sequelae, and medical contributors that can mimic attentional or social-cognitive difficulties.
4. **Measurement** — Consider standardized tools aligned to the dominant domain clusters.
5. **Planning** — Translate findings into client-centered goals; document rationale for the working formulation.`;

function reportHeader(context: ReportContext, sourceNote: string): string {
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `# Clinical assessment draft — ${context.clientName}

> **DRAFT — For clinician review only. Not a diagnosis.**  
> Generated ${date}${sourceNote}. Edit freely before use.`;
}

function notesBlock(context: ReportContext): string {
  if (!context.clinicianNotes) return "";
  return `## Clinician notes (integrated)

${context.clinicianNotes}

The above clinician observations should be treated as authoritative context when reconciling any tension between intake endorsements and clinical judgment.

`;
}

/**
 * Assemble the final report. Domain sections (when present) are injected
 * deterministically and never taken from LLM output.
 */
export function assembleClinicalReport(
  context: ReportContext,
  options?: {
    generative?: Partial<GenerativeReportParts> | null;
    sourceNote?: string;
  },
): string {
  const hasDomains = context.domains.length > 0;
  const narrative = buildNarrativeSections(context);
  const summary =
    options?.generative?.summary?.trim() || narrative.summary;
  const nextSteps =
    options?.generative?.nextSteps?.trim() || DEFAULT_NEXT_STEPS;
  const sourceNote =
    options?.sourceNote ?? " using structured template synthesis (no LLM)";

  if (hasDomains) {
    return `${reportHeader(context, sourceNote)}

## Clinical summary

${summary}

## Clinical domains

${formatDomainReportSections(context.domains)}

${notesBlock(context)}## Recommended next steps

${nextSteps}
`;
  }

  // Legacy / no domain summaries: theme formulations with coverage guarantee.
  let themeSections =
    options?.generative?.themeFormulations?.trim() || narrative.themeSections;
  if (context.themes.length > 0) {
    const missing = extractMissingThemeIds(themeSections, context.themes);
    if (missing.length > 0) {
      themeSections = ensureThemeCoverage(
        themeSections,
        context.themes,
        themeNarrative,
      );
    }
  }

  return `${reportHeader(context, sourceNote)}

## Clinical summary

${summary}

## Theme formulations

${themeSections}

${notesBlock(context)}## Recommended next steps

${nextSteps}
`;
}
