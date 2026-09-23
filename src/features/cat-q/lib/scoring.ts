/**
 * CAT-Q scoring engine.
 * Derives reverse scoring and subscale membership from the item configuration —
 * never hard-codes official item numbers.
 *
 * Does not apply diagnostic cutoffs or autism likelihood labels.
 */

import type { CatQAnswers, CatQItem, CatQLikertValue, CatQScores } from "../types";

export function isValidCatQLikert(value: unknown): value is CatQLikertValue {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 7
  );
}

/** Contribute one item's scored points (after reverse scoring when applicable). */
export function scoredItemValue(
  item: CatQItem,
  response: CatQLikertValue,
): number {
  return item.reverseScored ? 8 - response : response;
}

/**
 * Score answers against an item bank.
 * Pass a custom `items` array in tests; production uses the feature item bank.
 */
export function computeCatQScores(
  answers: CatQAnswers,
  items: CatQItem[],
): CatQScores {
  const scores: CatQScores = {
    total: 0,
    compensation: 0,
    masking: 0,
    assimilation: 0,
  };

  for (const item of items) {
    const response = answers[item.id];
    if (!isValidCatQLikert(response)) continue;
    const points = scoredItemValue(item, response);
    scores.total += points;
    scores[item.subscale] += points;
  }

  return scores;
}

export function missingRequiredCatQItemIds(
  answers: Record<string, unknown>,
  items: CatQItem[],
): string[] {
  return items
    .filter((item) => !isValidCatQLikert(answers[item.id]))
    .map((item) => item.id);
}

export function isCatQComplete(
  answers: Record<string, unknown>,
  items: CatQItem[],
): boolean {
  return missingRequiredCatQItemIds(answers, items).length === 0;
}
