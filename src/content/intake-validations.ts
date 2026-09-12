/**
 * Sparse reassuring messages during the assessment.
 * Placement uses progress milestones (and one early section boundary), not fixed
 * global question indices, so regrouping sections does not land copy on awkward items.
 */

const START_MESSAGE = "Take your time. There's no perfect answer.";

/** Shown on the first question of the second chapter (after the opening section). */
const AFTER_EARLY_SECTION =
  "Not every question will fit your experience — that's expected.";

/**
 * Progress fractions of the full questionnaire (0–1). Each message appears once,
 * on the first question whose progress meets or exceeds the fraction.
 */
const PROGRESS_MILESTONES: ReadonlyArray<{ fraction: number; message: string }> = [
  { fraction: 1 / 3, message: "'Not sure' is always okay." },
  { fraction: 1 / 2, message: "It's okay if some questions are difficult." },
  { fraction: 2 / 3, message: "Your first instinct is often the most helpful." },
  {
    fraction: 0.85,
    message: "You're doing fine. Answer based on the past several months.",
  },
];

function globalQuestionIndex(
  sectionIndex: number,
  questionIndex: number,
  sections: { questions: { id: string }[] }[],
): number {
  let globalIndex = questionIndex;
  for (let i = 0; i < sectionIndex; i++) {
    globalIndex += sections[i]?.questions.length ?? 0;
  }
  return globalIndex;
}

function totalQuestionCount(sections: { questions: { id: string }[] }[]): number {
  return sections.reduce((n, s) => n + s.questions.length, 0);
}

function crossesProgressMilestone(
  globalIndex: number,
  total: number,
  fraction: number,
): boolean {
  if (total <= 0) return false;
  const progress = globalIndex / total;
  const previous = globalIndex === 0 ? -1 : (globalIndex - 1) / total;
  return previous < fraction && progress >= fraction;
}

export function getMicroValidation(
  sectionIndex: number,
  questionIndex: number,
  sections: { questions: { id: string }[] }[],
): string | null {
  const total = totalQuestionCount(sections);
  if (total === 0) return null;

  const globalIndex = globalQuestionIndex(sectionIndex, questionIndex, sections);

  if (globalIndex === 0) return START_MESSAGE;

  // First question of chapter 2 — after the opening social/world section.
  if (sectionIndex === 1 && questionIndex === 0) return AFTER_EARLY_SECTION;

  for (const milestone of PROGRESS_MILESTONES) {
    if (crossesProgressMilestone(globalIndex, total, milestone.fraction)) {
      return milestone.message;
    }
  }

  return null;
}
