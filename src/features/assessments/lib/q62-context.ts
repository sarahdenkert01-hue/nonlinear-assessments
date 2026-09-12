import { QUESTIONS } from "../data/questions";
import { isQuestionTriggered } from "./scoring";
import {
  isAssessmentQuestion,
  type AssessmentAnswers,
} from "../types";

export type Q62EndorsementStrength = "Agree" | "Strongly agree";

/** Non-scored clinical context when q62 is endorsed at flag threshold. */
export type Q62AcquiredEfContext = {
  strength: Q62EndorsementStrength;
};

const Q62 = QUESTIONS.find((q) => isAssessmentQuestion(q) && q.id === "q62");

/**
 * Resolve q62 as contextual self-report only.
 * Returns null when not endorsed — never produces theme hits or findings.
 */
export function resolveQ62AcquiredEfContext(
  answer: string | null | undefined,
): Q62AcquiredEfContext | null {
  if (!Q62 || !isAssessmentQuestion(Q62)) return null;
  if (!isQuestionTriggered(Q62, answer ?? undefined)) return null;
  if (answer === "Agree" || answer === "Strongly agree") {
    return { strength: answer };
  }
  return null;
}

export function resolveQ62AcquiredEfContextFromAnswers(
  answers: AssessmentAnswers,
): Q62AcquiredEfContext | null {
  return resolveQ62AcquiredEfContext(answers.q62);
}

export function q62StrengthVerb(strength: Q62EndorsementStrength): string {
  return strength === "Strongly agree" ? "strongly agreed" : "agreed";
}

/** Assert q62 stays out of theme scoring (tests + documentation). */
export function q62ThemeIds(): string[] {
  if (!Q62 || !isAssessmentQuestion(Q62)) return [];
  return [...Q62.themes];
}
