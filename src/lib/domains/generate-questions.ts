import { callDomainLlmWithFallback } from "./domain-llm";
import type { DomainFindingRef } from "./types";
import {
  buildSuggestQuestionsPrompt,
  generateTemplateQuestions,
  type SuggestQuestionsContext,
} from "./suggest-questions";

export type { SuggestQuestionsContext };

export interface GeneratedSuggestedQuestions {
  draft: string;
  source: "gemini" | "anthropic" | "template";
  generatedAt: string;
  fallbackReason?: string;
}

export async function generateSuggestedQuestions(
  ctx: SuggestQuestionsContext,
): Promise<GeneratedSuggestedQuestions> {
  const generatedAt = new Date().toISOString();
  const result = await callDomainLlmWithFallback(
    buildSuggestQuestionsPrompt(ctx),
    () => generateTemplateQuestions(ctx),
    768,
  );
  return {
    draft: result.text,
    source: result.source,
    generatedAt,
    fallbackReason: result.fallbackReason,
  };
}

export function buildQuestionsContextFromDetail(detail: {
  domainId: string;
  label: string;
  findings: DomainFindingRef[];
  suggestedGaps: string[];
  sourceTypes: SuggestQuestionsContext["presentSources"];
}): SuggestQuestionsContext {
  return {
    domainId: detail.domainId,
    domainLabel: detail.label,
    findingCodes: detail.findings.map((f) => f.code),
    findingLabels: detail.findings.map((f) => f.label),
    opportunities: detail.suggestedGaps,
    presentSources: detail.sourceTypes,
  };
}
