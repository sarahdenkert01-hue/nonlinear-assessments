import type { ReportContext } from "./build-context";
import type { ReportProfile } from "./types";

const PROFILE_HINTS: Record<ReportProfile, string> = {
  brief: "Keep the entire report concise (roughly 1 page). Short paragraphs only.",
  standard: "Use moderate depth (roughly 2–3 pages).",
  detailed:
    "Use comprehensive depth (roughly 4+ pages). Expand functional analysis per theme.",
};

export function buildReportPrompt(
  context: ReportContext,
  options?: { profile?: ReportProfile; narrativeOnly?: boolean; existingDraft?: string },
): string {
  const themesJson = JSON.stringify(context.themes, null, 2);
  const profile = options?.profile ?? "standard";
  const narrativeOnly = options?.narrativeOnly && options.existingDraft?.trim();

  const narrativeOnlyBlock = narrativeOnly
    ? `
## Narrative-only regeneration
The clinician already approved theme subsections. Rewrite ONLY:
- **Clinical summary**
- **Recommended next steps**
Do NOT change theme subsection titles or the list of themes covered.
Preserve this draft's theme sections verbatim where possible:

---
${options.existingDraft}
---
`
    : "";

  return `You are an expert clinical writer assisting a licensed clinician. Draft a narrative clinical assessment report in Markdown for "${context.clientName}".

## Length profile
${PROFILE_HINTS[profile]}
${narrativeOnlyBlock}

## Your task
Synthesize intake data into readable clinical prose — like a psychologist's draft memo, not a data export.

## Required structure
1. **Clinical summary** (2–4 paragraphs): Cross-cutting patterns, functional impact on daily life, strengths/resources if evident in the data, and overall clinical picture. Write in third person about the client.
2. **Theme formulations** (one subsection per included theme): For each theme, write 2–3 paragraphs of clinical interpretation:
   - What this theme means functionally (work, relationships, self-regulation, identity)
   - How endorsed items fit together as a pattern (do not list every item as bullets)
   - Clinical hypotheses to explore in interview (phrased as "may suggest" / "warrants exploration", not definitive diagnosis)
   - End with a short **Supporting indicators** line with 2–4 key item IDs only (e.g. "Indicators: q01, q07, q12")
3. **Integration with clinician notes** (if notes provided): Weave clinician observations into the formulation.
4. **Recommended next steps**: Specific follow-up (collateral, standardized measures, referral types, safety check if relevant from data).

## Strict rules
- Do NOT output the report as a bullet list of questionnaire questions and answers.
- Do NOT repeat every item ID and full question text — synthesize into narrative.
- Use only provided data; do not invent trauma history, diagnoses, medications, or family details not in the themes/notes.
- Label clearly at the top: "DRAFT — For clinician review. Not a diagnosis."
- Neutral, professional tone. Avoid stigmatizing language.
- ${context.themes.length} theme(s) must each receive a substantive narrative subsection.

## Clinician notes
${context.clinicianNotes?.trim() || "(none provided)"}

## Structured theme data (use for synthesis, not for copy-paste listing)
${themesJson}`;
}
