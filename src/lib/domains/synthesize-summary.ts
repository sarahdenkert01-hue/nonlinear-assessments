import { callDomainLlmWithFallback } from "./domain-llm";
import type { DomainEvidenceItem, DomainFindingRef } from "./types";

export interface EvidenceSummaryContext {
  domainLabel: string;
  domainDescription: string;
  findings: DomainFindingRef[];
  supplementalEvidence: DomainEvidenceItem[];
}

export type EvidenceSummarySource = "gemini" | "anthropic" | "template";

export interface GeneratedEvidenceSummary {
  draft: string;
  source: EvidenceSummarySource;
  generatedAt: string;
  fallbackReason?: string;
}

function buildClinicalSynthesisPrompt(ctx: EvidenceSummaryContext): string {
  const findingBlocks = ctx.findings.map((f) => {
    const evidenceLines = f.evidence
      .map((e) => `  - Q: ${e.text}\n    A: ${e.answer || "(no response)"}`)
      .join("\n");
    return `- ${f.label} (${f.hits}/${f.total} indicators)\n${evidenceLines || "  (no item-level evidence)"}`;
  });

  const supplemental = ctx.supplementalEvidence
    .filter((e) => e.excerpt?.trim())
    .map((e) => `- [${e.sourceType}] ${e.excerpt}`)
    .join("\n");

  return `You are assisting a clinician synthesizing confirmed assessment evidence into a domain-level clinical synthesis.

DOMAIN: ${ctx.domainLabel}
DESCRIPTION: ${ctx.domainDescription}

CONFIRMED FINDINGS AND SUPPORTING RESPONSES:
${findingBlocks.length > 0 ? findingBlocks.join("\n\n") : "(none)"}

${supplemental ? `ADDITIONAL EVIDENCE:\n${supplemental}\n` : ""}
Write a clinical synthesis (2–4 short paragraphs) structured as:
1. OBSERVATIONS: What the confirmed evidence shows (behaviors, self-report, patterns) — descriptive only
2. EMERGING THEMES: Recurring themes across findings
3. FUNCTIONAL IMPACT: How patterns may affect daily life (tentative, non-conclusive language)
4. STRENGTHS (if relevant): Compensatory strategies or protective factors evident in the data

Requirements:
- Clearly separate observation from interpretation — label interpretive statements tentatively ("may suggest", "is consistent with")
- Do NOT diagnose, label the client, or state diagnostic conclusions
- Do NOT use certainty language ("clearly", "definitely", " confirms")
- Do NOT recommend treatment or next steps
- Do NOT assign confidence levels

This is an AI draft for clinician review — write in third person about "the client" where needed.`;
}

export function generateTemplateClinicalSynthesis(ctx: EvidenceSummaryContext): string {
  const lines: string[] = [
    `Clinical synthesis for ${ctx.domainLabel}.`,
    "",
    "OBSERVATIONS",
  ];

  if (ctx.findings.length === 0) {
    lines.push("No confirmed findings are linked to this domain yet.");
  } else {
    for (const f of ctx.findings) {
      lines.push(`- ${f.label} (${f.hits} of ${f.total} indicators endorsed).`);
      for (const e of f.evidence.slice(0, 2)) {
        lines.push(`  · "${e.text}" — ${e.answer || "no response recorded"}`);
      }
    }
  }

  lines.push("", "EMERGING THEMES");
  if (ctx.findings.length >= 2) {
    lines.push(
      `- Multiple confirmed themes (${ctx.findings.map((f) => f.label).join(", ")}) may reflect overlapping patterns in this domain.`,
    );
  } else if (ctx.findings.length === 1) {
    lines.push(`- Primary theme: ${ctx.findings[0]!.label}.`);
  } else {
    lines.push("- Insufficient confirmed findings to identify themes.");
  }

  lines.push("", "FUNCTIONAL IMPACT");
  lines.push(
    "- Functional impact should be explored in interview; self-report evidence above may inform but not conclude impact.",
  );

  const notes = ctx.supplementalEvidence.filter((e) => e.excerpt?.trim());
  if (notes.length > 0) {
    lines.push("", "ADDITIONAL CONTEXT");
    for (const n of notes) {
      lines.push(`- ${n.excerpt}`);
    }
  }

  lines.push("", "Clinician review is required. This draft does not belong in a report without editing.");
  return lines.join("\n");
}

/** @deprecated alias for tests */
export const generateTemplateEvidenceSummary = generateTemplateClinicalSynthesis;

export async function generateDomainEvidenceSummary(
  ctx: EvidenceSummaryContext,
): Promise<GeneratedEvidenceSummary> {
  const generatedAt = new Date().toISOString();
  const result = await callDomainLlmWithFallback(
    buildClinicalSynthesisPrompt(ctx),
    () => generateTemplateClinicalSynthesis(ctx),
    1024,
  );
  return {
    draft: result.text,
    source: result.source,
    generatedAt,
    fallbackReason: result.fallbackReason,
  };
}
