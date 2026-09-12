import { callDomainLlmWithFallback } from "./domain-llm";
import type { DomainFindingRef } from "./types";

export interface SuggestDifferentialsContext {
  domainLabel: string;
  domainDescription: string;
  findings: DomainFindingRef[];
  /** When true, client endorsed q62 (acquired/worsened EF after life change). */
  acquiredEfChangeEndorsed?: boolean;
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

const EXECUTIVE_FUNCTION_DIFFERENTIALS = [
  "Could ADHD-related activation patterns contribute—especially if urgency, novelty, or interest temporarily unlock initiation—without treating that as diagnostic proof?",
  "Could autistic inertia or transition difficulty contribute—especially if predictability, reduced sensory load, closure, or another person’s support helps starting or switching—without treating that as diagnostic proof?",
  "Could anxiety (avoidance, fear of getting it wrong, anticipatory freeze) better explain initiation or switching problems?",
  "Could depression or low energy/motivation better explain reduced initiation or follow-through?",
  "Could trauma-related freeze, hypervigilance, or threat responses interfere with starting, stopping, or shifting?",
  "Could chronic pain, fatigue, or medical/neurological factors limit access to executive skills the client otherwise knows how to use?",
  "Could sleep disturbance or medication effects be amplifying working memory, time sense, or initiation problems?",
  "Could burnout, sensory overload, or cognitive overload make usually-available skills temporarily inaccessible?",
  "Working memory, sequencing, and time difficulties are nonspecific—what developmental history supports or challenges a developmental ADHD framing?",
  "Difficulty stopping or disengaging can be clinically informative autism-related context—what evidence keeps this from being over-interpreted as diagnostic proof?",
];

function isExecutiveFunctionDomain(label: string, description: string): boolean {
  const haystack = `${label} ${description}`.toLowerCase();
  return (
    haystack.includes("executive") ||
    haystack.includes("initiation") ||
    haystack.includes("task management") ||
    haystack.includes("planning")
  );
}

function buildDifferentialsPrompt(ctx: SuggestDifferentialsContext): string {
  const findingList = ctx.findings.map((f) => `- ${f.label} (${f.hits}/${f.total})`).join("\n");
  const acquiredNote = ctx.acquiredEfChangeEndorsed
    ? `\nCLIENT CONTEXT: The client endorsed that starting/organizing/remembering/completing difficulties became significantly worse after a life change (e.g. pain, illness, trauma, burnout, sleep, stress). Prompt the clinician to weigh acquired/state-dependent causes before assuming developmental ADHD.\n`
    : "";

  const efExtra = isExecutiveFunctionDomain(ctx.domainLabel, ctx.domainDescription)
    ? `
For executive functioning / activation domains, include prompts that weigh:
- ADHD (urgency/novelty unlocking action = clue, not proof)
- autistic inertia / transition difficulty (structure, sensory load, co-regulation helping = clue, not proof)
- anxiety, depression, trauma, chronic pain, fatigue, sleep, burnout, sensory/cognitive overload
- medication or medical/neurological contributors when relevant
- developmental course vs acquired worsening
Do NOT conclude a diagnosis.
`
    : "";

  return `You are assisting a clinician exploring alternative explanations for assessment observations.

DOMAIN: ${ctx.domainLabel}
DESCRIPTION: ${ctx.domainDescription}
CONFIRMED FINDINGS:
${findingList || "(none)"}
${acquiredNote}${efExtra}
Generate 4–6 differential consideration PROMPTS (not diagnoses) as a bullet list (use • prefix).
Each prompt should:
- Suggest an alternative explanation the clinician might weigh (trauma, sleep, anxiety, mood, medical, contextual factors, ADHD vs inertia/context)
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
  ];

  if (isExecutiveFunctionDomain(ctx.domainLabel, ctx.domainDescription)) {
    lines.push(...EXECUTIVE_FUNCTION_DIFFERENTIALS.map((p) => `• ${p}`));
  } else {
    lines.push(...TEMPLATE_PROMPTS.map((p) => `• ${p}`));
  }

  if (ctx.acquiredEfChangeEndorsed) {
    lines.push(
      "",
      "• Client endorsed acquired/worsened EF after a life change—how strongly does developmental history support ADHD versus pain, illness, trauma, burnout, sleep, depression, or anxiety?",
      "• What would you expect if these difficulties were primarily state-dependent rather than lifelong developmental ADHD?",
    );
  }

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

/** Exported for tests — template path without LLM. */
export function buildTemplateDifferentialPromptsForTest(
  ctx: SuggestDifferentialsContext,
): string[] {
  return parseBulletList(generateTemplateDifferentialPrompts(ctx));
}
