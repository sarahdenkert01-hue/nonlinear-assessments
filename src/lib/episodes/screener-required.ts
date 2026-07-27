import { QUESTIONS } from "@/features/assessments/data/questions";
import { isAssessmentQuestion, type AssessmentAnswers } from "@/features/assessments/types";

/**
 * Scored screener items required before final submit.
 * Open-text "context" items (q47–q49) are optional.
 */
export function requiredScreenerItemIds(
  questions = QUESTIONS,
): string[] {
  return questions
    .filter(isAssessmentQuestion)
    .filter((q) => q.format === "frequency" || q.format === "agreement")
    .map((q) => q.id);
}

export function missingRequiredScreenerItems(
  answers: AssessmentAnswers,
  requiredIds: string[] = requiredScreenerItemIds(),
): string[] {
  return requiredIds.filter((id) => !(answers[id] ?? "").trim());
}

export function mergeAnswerMaps(
  existing: AssessmentAnswers,
  incoming: AssessmentAnswers,
): AssessmentAnswers {
  return { ...existing, ...incoming };
}
