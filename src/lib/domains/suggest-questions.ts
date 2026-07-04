import type { EvidenceSourceType } from "./types";

/** Static interview prompts keyed by domain and finding theme — template fallback. */
const DOMAIN_QUESTIONS: Record<string, string[]> = {
  "executive-function": [
    "When did difficulties with planning, initiation, or task management first appear?",
    "How were these challenges viewed in school or early work settings?",
    "What strategies have you developed to compensate?",
    "What happens when demands exceed your capacity?",
  ],
  "attention-regulation": [
    "When is focus easiest versus hardest for you?",
    "How consistent is your attention across different settings?",
    "What environmental factors help or hinder focus?",
  ],
  "emotional-regulation": [
    "How quickly do strong emotions escalate, and how long do they last?",
    "What helps you recover after emotional flooding?",
    "Are there patterns to when regulation is hardest?",
  ],
  "masking-adaptation": [
    "What situations require the most masking or social effort?",
    "How do you feel after extended masking?",
    "What happens when you stop masking or are alone?",
  ],
  "burnout-collapse": [
    "What typically precedes periods of burnout or shutdown?",
    "What helps you recover, and how long do recovery periods last?",
    "How does functional capacity change during and after collapse?",
  ],
  "sensory-processing": [
    "Which sensory environments are most overwhelming?",
    "How do you manage or avoid sensory overload?",
    "When did sensory sensitivities first become noticeable?",
  ],
  "nervous-system-regulation": [
    "What triggers a heightened stress or vigilance response?",
    "How does your body signal overload or dysregulation?",
    "What calms or restores your nervous system?",
  ],
  "social-communication": [
    "What social situations require the most cognitive effort?",
    "How do you process social cues or rejection sensitivity?",
    "What is the cost of social interaction afterward?",
  ],
  "identity-self-concept": [
    "When did you first notice a gap between inner experience and outward presentation?",
    "How has identity shifted across life stages?",
    "What parts of self feel most hidden or fragmented?",
  ],
  "trauma-overlap": [
    "Which experiences may overlap with current presentation?",
    "How do stress and trauma history interact with daily functioning?",
    "What evidence distinguishes trauma responses from other patterns?",
  ],
  "relational-safety": [
    "What helps you feel safe in close relationships?",
    "How does attachment history shape current relational patterns?",
    "When do trust or safety feel most threatened?",
  ],
  "functional-impact": [
    "Where is functional impact most visible — work, home, relationships?",
    "How variable is day-to-day functioning?",
    "What supports maintain functional consistency?",
  ],
  "developmental-history": [
    "What was noticed in childhood by family or teachers?",
    "How did presentation change across developmental stages?",
    "Were there periods of compensation or masking in youth?",
  ],
  "strengths-protective-factors": [
    "What strengths help you navigate daily life?",
    "What resources or relationships are most protective?",
    "What interests or environments bring out your best functioning?",
  ],
};

const FINDING_QUESTIONS: Record<string, string[]> = {
  masking: [
    "What situations require the most masking?",
    "How do you feel after masking?",
    "What happens when you stop masking?",
  ],
  "masking-fatigue": [
    "How long can you sustain masking before fatigue sets in?",
    "What are early signs that masking cost is accumulating?",
  ],
  "neurodivergent-burnout": [
    "What typically precedes burnout?",
    "What helps you recover, and how long does recovery take?",
  ],
  "burnout-recovery": [
    "What does recovery look like for you?",
    "What supports speed or slow recovery?",
  ],
  "task-paralysis": [
    "When does task initiation become hardest?",
    "What unblocks you when paralysis sets in?",
  ],
  "executive-dysfunction": [
    "When did planning or organization difficulties first appear?",
    "How were these viewed in school?",
  ],
};

export interface SuggestQuestionsContext {
  domainId: string;
  domainLabel: string;
  findingCodes: string[];
  findingLabels: string[];
  opportunities: string[];
  presentSources: EvidenceSourceType[];
}

export function generateTemplateQuestions(ctx: SuggestQuestionsContext): string {
  const seen = new Set<string>();
  const lines: string[] = [];

  const add = (q: string) => {
    const key = q.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      lines.push(`• ${q}`);
    }
  };

  for (const code of ctx.findingCodes) {
    for (const q of FINDING_QUESTIONS[code] ?? []) add(q);
  }

  for (const q of DOMAIN_QUESTIONS[ctx.domainId] ?? []) add(q);

  if (ctx.opportunities.some((o) => /developmental|childhood/i.test(o))) {
    add("What was your presentation like in childhood compared to now?");
    add("When did others first notice these patterns?");
  }
  if (ctx.opportunities.some((o) => /collateral/i.test(o))) {
    add("Who could provide an outside perspective on daily functioning?");
  }
  if (ctx.opportunities.some((o) => /observation/i.test(o))) {
    add("What would be observable in session that self-report might miss?");
  }
  if (ctx.opportunities.some((o) => /interview/i.test(o))) {
    add("What follow-up areas need deeper exploration in interview?");
  }

  if (lines.length === 0) {
    lines.push(`• What additional context would strengthen understanding of ${ctx.domainLabel}?`);
    lines.push("• How does this domain show up across settings and over time?");
  }

  return [
    `Suggested clinical questions for ${ctx.domainLabel}.`,
    "These are interview prompts — not diagnostic questions. Ignore any that are not useful.",
    "",
    ...lines,
  ].join("\n");
}

export function buildSuggestQuestionsPrompt(ctx: SuggestQuestionsContext): string {
  const opportunityBlock =
    ctx.opportunities.length > 0
      ? ctx.opportunities.map((o) => `- ${o}`).join("\n")
      : "(none identified)";

  return `You are assisting a clinician preparing interview questions for a neurodivergent assessment.

DOMAIN: ${ctx.domainLabel}
CONFIRMED FINDING THEMES: ${ctx.findingLabels.join(", ") || "(none)"}
PRESENT EVIDENCE SOURCES: ${ctx.presentSources.join(", ") || "(none)"}
ASSESSMENT OPPORTUNITIES:
${opportunityBlock}

Generate 5–8 suggested clinical interview questions as a bullet list (use • prefix).
Requirements:
- Questions should deepen understanding of this domain
- Tailor to the confirmed finding themes and missing evidence opportunities
- Do NOT ask diagnostic questions or suggest diagnoses
- Do NOT use certainty language
- Focus on developmental history, functional impact, contextual factors, and longitudinal course where relevant
- The clinician may ignore any question

Return only the bullet list, no preamble.`;
}
