import type { ReportContext } from "./build-context";
import { buildNarrativeSections } from "./narrative";

/** Deterministic narrative draft when no LLM is available or the LLM call fails. */
export function generateTemplateReport(context: ReportContext): string {
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const { summary, themeSections } = buildNarrativeSections(context);

  const notesBlock = context.clinicianNotes
    ? `## Clinician notes (integrated)

${context.clinicianNotes}

The above clinician observations should be treated as authoritative context when reconciling any tension between intake endorsements and clinical judgment.
`
    : "";

  return `# Clinical assessment draft — ${context.clientName}

> **DRAFT — For clinician review only. Not a diagnosis.**  
> Generated ${date} using structured template synthesis (no LLM). Edit freely before use.

## Clinical summary

${summary}

## Theme formulations

${themeSections}

${notesBlock}## Recommended next steps

1. **Clinical interview** — Clarify onset, pervasiveness across settings, compensatory strategies, and impact on relationships, work/school, and self-care.
2. **Collateral** — When appropriate, gather developmental history and observer report (partner, parent, employer) for themes with few endorsed items or clinician overrides.
3. **Rule-outs** — Screen for sleep disruption, mood/anxiety disorders, trauma sequelae, and medical contributors that can mimic attentional or social-cognitive difficulties.
4. **Measurement** — Consider standardized tools aligned to the dominant theme clusters (autism-informed, ADHD-informed, or mood/anxiety measures as indicated).
5. **Planning** — Translate findings into client-centered goals; document rationale if any included theme was excluded from the working formulation.

---

_This template draft synthesizes intake themes into narrative form. For richer, individualized prose, configure \`GEMINI_API_KEY\` or \`ANTHROPIC_API_KEY\` and regenerate._
`;
}
