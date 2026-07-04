import { callDomainLlmWithFallback } from "./domain-llm";
import type { DomainFindingRef } from "./types";

export interface SuggestDifferentialsContext {
  domainLabel: string;
  domainDescription: string;
  findings: DomainFindingRef[];
}

export interface GeneratedDifferentialPrompts {
  prompts: string[];
  source: "gemini" | "anthropic" | "template";
  generatedAt: string;
  fallbackReason?: string;
}

const TEMPLATE_PROMPTS = [
  "Could trauma explain some of these observations?",
  "Could sleep disruption be contributing to this presentation?",
  "Is anxiety amplifying what we are seeing in this domain?",
  "Could mood variability account for some of the pattern?",
  "What evidence supports or contradicts each alternative explanation?",
];

function buildDifferentialsPrompt(ctx: SuggestDifferentialsContext): string {
  const findingList = ctx.findings.map((f) => `- ${f.label} (${f.hits}/${f.total})`).join("\n");

  return `You are assisting a clinician exploring alternative explanations for assessment observations.

DOMAIN: ${ctx.domainLabel}
DESCRIPTION: ${ctx.domainDescription}
CONFIRMED FINDINGS:
${findingList || "(none)"}

Generate 4–6 differential consideration PROMPTS (not diagnoses) as a bullet list (use • prefix).
Each prompt should:
- Suggest an alternative explanation the clinician might weigh (trauma, sleep, anxiety, medical, contextual factors)
- Be phrased as a question or reflective prompt
- NOT state or imply a diagnosis
- NOT conclude which explanation is correct

Return only the bullet list, no preamble.`;
}

function generateTemplateDifferentialPrompts(ctx: SuggestDifferentialsContext): string {
  const lines = [
    `Differential prompts for ${ctx.domainLabel}.`,
    "These are reflective prompts — not diagnoses. Copy any that are useful.",
    "",
    ...TEMPLATE_PROMPTS.map((p) => `• ${p}`),
  ];
  if (ctx.findings.length > 0) {
    lines.push(
      "",
      `• Could contextual factors (stress, life transitions) explain variation in ${ctx.findings[0]!.label.toLowerCase()}?`,
    );
  }
  return lines.join("\n");
}

function parseBulletList(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(/^[\s•\-*]+/, "").trim())
    .filter(Boolean);
}

export async function generateDifferentialPrompts(
  ctx: SuggestDifferentialsContext,
): Promise<GeneratedDifferentialPrompts> {
  const generatedAt = new Date().toISOString();
  const result = await callDomainLlmWithFallback(
    buildDifferentialsPrompt(ctx),
    () => generateTemplateDifferentialPrompts(ctx),
    512,
  );
  return {
    prompts: parseBulletList(result.text),
    source: result.source,
    generatedAt,
    fallbackReason: result.fallbackReason,
  };
}

export function formatDifferentialPromptsDraft(prompts: string[]): string {
  return prompts.map((p) => `• ${p}`).join("\n");
}
