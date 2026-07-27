import type { AssessmentAnswers, QuestionFormat } from "../types";

export type AutoAdvanceContext = {
  singleQuestionMode: boolean;
  format: QuestionFormat | undefined;
  questionIndex: number;
  questionsInSection: number;
};

/** Auto-advance only within the same section for frequency/agreement items. */
export function canAutoAdvanceAfterAnswer(ctx: AutoAdvanceContext): boolean {
  if (!ctx.singleQuestionMode) return false;
  if (ctx.format !== "frequency" && ctx.format !== "agreement") return false;
  return ctx.questionIndex < ctx.questionsInSection - 1;
}

/** Hide Continue when auto-advance will handle mid-section scale questions. */
export function shouldShowContinueCta(ctx: AutoAdvanceContext): boolean {
  return !canAutoAdvanceAfterAnswer(ctx);
}

export function commitAnswerToMap(
  prev: AssessmentAnswers,
  itemId: string,
  value: string,
): AssessmentAnswers {
  return { ...prev, [itemId]: value };
}

/**
 * Pure navigation guard for the select → Continue race.
 * - While auto-advance is armed, Continue is ignored (no second +1).
 * - Manual Continue/Previous cancels the pending timer (caller clears timer).
 */
export type NavAction = "auto_advance" | "continue" | "previous" | "jump" | "unmount";

export function shouldIgnoreContinueWhileAutoAdvanceArmed(armed: boolean): boolean {
  return armed;
}

export function nextQuestionIndexAfterAdvance(
  questionIndex: number,
  questionsInSection: number,
): number {
  return Math.min(questionIndex + 1, Math.max(questionsInSection - 1, 0));
}

/**
 * Simulate: answer selected (arms auto-advance), then Continue clicked before timer fires.
 * Expected: only one advance; Continue ignored while armed.
 */
export function resolveSelectThenContinue(args: {
  armed: boolean;
  questionIndex: number;
  questionsInSection: number;
  continueClicked: boolean;
  timerFired: boolean;
}): { questionIndex: number; continueIgnored: boolean; advancedByTimer: boolean } {
  let questionIndex = args.questionIndex;
  let continueIgnored = false;
  let advancedByTimer = false;
  let armed = args.armed;

  if (args.continueClicked) {
    if (shouldIgnoreContinueWhileAutoAdvanceArmed(armed)) {
      continueIgnored = true;
    } else {
      questionIndex = nextQuestionIndexAfterAdvance(questionIndex, args.questionsInSection);
      armed = false;
    }
  }

  if (args.timerFired && armed) {
    questionIndex = nextQuestionIndexAfterAdvance(questionIndex, args.questionsInSection);
    advancedByTimer = true;
    armed = false;
  }

  return { questionIndex, continueIgnored, advancedByTimer };
}

/**
 * Simulate: Previous clicked while auto-advance armed → cancel timer, go previous, no forward skip.
 */
export function resolvePreviousWhileArmed(args: {
  questionIndex: number;
  cancelArmed: boolean;
}): { questionIndex: number; armed: boolean } {
  const armed = args.cancelArmed ? false : true;
  const questionIndex = Math.max(0, args.questionIndex - 1);
  return { questionIndex, armed };
}
