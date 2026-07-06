/** Sparse reassuring messages during the assessment — shown only at specific moments. */

const VALIDATION_BY_GLOBAL_QUESTION: Record<number, string> = {
  0: "Take your time. There's no perfect answer.",
  8: "Not every question will fit your experience — that's expected.",
  17: "'Not sure' is always okay.",
  26: "It's okay if some questions are difficult.",
  35: "Your first instinct is often the most helpful.",
  44: "You're doing fine. Answer based on the past several months.",
};

export function getMicroValidation(
  sectionIndex: number,
  questionIndex: number,
  sections: { questions: { id: string }[] }[],
): string | null {
  let globalIndex = questionIndex;
  for (let i = 0; i < sectionIndex; i++) {
    globalIndex += sections[i]?.questions.length ?? 0;
  }
  return VALIDATION_BY_GLOBAL_QUESTION[globalIndex] ?? null;
}
