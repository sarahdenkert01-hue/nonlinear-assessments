import type { ReportContext } from "./build-context";
import { formatDomainReportSections } from "./domain-sections";
import type { ReportProfile } from "./types";

const PROFILE_HINTS: Record<ReportProfile, string> = {
  brief: "Keep the generative sections concise (roughly 1 page total with domains).",
  standard: "Use moderate depth for the clinical summary and next steps.",
  detailed:
    "Use comprehensive depth for the clinical summary and next steps (domains are already written).",
};

/**
 * Prompt for generative sections only. Domain narratives are fixed source material
 * and must not be rewritten or omitted by the model — they are assembled outside the LLM.
 */
export function buildReportPrompt(
  context: ReportContext,
  options?: { profile?: ReportProfile; narrativeOnly?: boolean; existingDraft?: string },
): string {
  const profile = options?.profile ?? "standard";
  const hasDomains = context.domains.length > 0;
  const themesJson = JSON.stringify(context.themes, null, 2);
  const domainsBlock = hasDomains
    ? formatDomainReportSections(context.domains)
    : "(none — no clinician-authored domain summaries yet)";

  const narrativeOnlyBlock =
    options?.narrativeOnly && options.existingDraft?.trim()
      ? `
## Narrative-only regeneration
Rewrite ONLY the clinical summary and recommended next steps.
Do NOT invent or alter clinical domain sections — those are assembled outside your response.
Preserve intent from this draft where helpful:

---
${options.existingDraft}
---
`
      : "";

  if (hasDomains) {
    return `You are an expert clinical writer assisting a licensed clinician. Write ONLY the generative framing sections for "${context.clientName}".

## Length profile
${PROFILE_HINTS[profile]}
${narrativeOnlyBlock}

## Fixed clinician domain narratives (READ-ONLY)
These domains already appear in the final report verbatim. Do NOT rewrite, summarize, omit, reorder, or reinterpret them. Use them only as source material for the overall clinical summary and next steps.

${domainsBlock}

## Supporting approved findings (context only; ACCEPTED/EDITED)
${themesJson}

## Clinician notes
${context.clinicianNotes?.trim() || "(none provided)"}

## Your task
Output EXACTLY these two marked blocks and nothing else (no domain subsections, no theme subsections):

<<<CLINICAL_SUMMARY>>>
2–4 paragraphs: cross-cutting patterns, functional impact, strengths if evident, overall clinical picture. Third person. Do not invent facts beyond the provided domains/findings/notes.
<<<END_CLINICAL_SUMMARY>>>

<<<NEXT_STEPS>>>
Specific follow-up recommendations (interview, collateral, measures, rule-outs, planning). Markdown list is fine.
<<<END_NEXT_STEPS>>>

## Strict rules
- Do NOT output Clinical domains or Theme formulations sections.
- Do NOT change domain titles or domain body text.
- Label tone: neutral, professional; this is a draft, not a diagnosis.
- Use only provided data.`;
  }

  // Legacy theme-based generative prompt (no clinician domain summaries).
  return `You are an expert clinical writer assisting a licensed clinician. Draft generative framing for "${context.clientName}" from approved clinical themes.

## Length profile
${PROFILE_HINTS[profile]}
${narrativeOnlyBlock}

## Your task
Output EXACTLY these marked blocks:

<<<CLINICAL_SUMMARY>>>
2–4 paragraphs synthesizing the approved themes. Third person. Not a diagnosis.
<<<END_CLINICAL_SUMMARY>>>

<<<THEME_FORMULATIONS>>>
One ### subsection per approved theme (${context.themes.length} required). For each: functional meaning, pattern synthesis, interview hypotheses ("may suggest"), and a short Supporting indicators line with 2–4 item IDs.
<<<END_THEME_FORMULATIONS>>>

<<<NEXT_STEPS>>>
Specific follow-up recommendations.
<<<END_NEXT_STEPS>>>

## Strict rules
- ${context.themes.length} theme(s) must each receive a substantive ### subsection with the exact theme label as the heading.
- Use only provided data; do not invent trauma history, diagnoses, medications, or family details.
- Neutral, professional tone.

## Clinician notes
${context.clinicianNotes?.trim() || "(none provided)"}

## Structured theme data
${themesJson}`;
}
