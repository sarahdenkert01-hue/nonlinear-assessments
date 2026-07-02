import type { Prisma } from "@prisma/client";
import type { AssessmentAnswers } from "@/features/assessments";

// Sprint 1 stores each answer as its own Response row (itemId -> value). The scoring and report
// code still works with a flat { itemId: answer } map, so these two small helpers translate
// between the normalized rows and that map. Kept explicit rather than generic on purpose.

type ResponseRow = { itemId: string; value: Prisma.JsonValue };

export function responsesToAnswers(rows: ResponseRow[]): AssessmentAnswers {
  const answers: AssessmentAnswers = {};
  for (const row of rows) {
    answers[row.itemId] = typeof row.value === "string" ? row.value : String(row.value);
  }
  return answers;
}

// The item ids + values a client submitted, ready to be written as Response rows.
export function answersToRows(
  answers: AssessmentAnswers,
): { itemId: string; value: string }[] {
  return Object.entries(answers).map(([itemId, value]) => ({ itemId, value }));
}
