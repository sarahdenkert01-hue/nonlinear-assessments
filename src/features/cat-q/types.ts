/**
 * CAT-Q (Camouflaging Autistic Traits Questionnaire) types.
 * Official item wording and subscale/reverse mappings: Hull et al. (2019).
 */

export type CatQSubscale = "compensation" | "masking" | "assimilation";

export type CatQItem = {
  id: string;
  itemNumber: number;
  /** Exact validated English wording from Hull et al. (2019) Online Appendix 1. */
  text: string;
  subscale: CatQSubscale;
  reverseScored: boolean;
};

/** Likert response value stored on Response rows (JSON number 1–7). */
export type CatQLikertValue = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Flat map of itemId → Likert integer. */
export type CatQAnswers = Record<string, CatQLikertValue>;

export type CatQScores = {
  total: number;
  compensation: number;
  masking: number;
  assimilation: number;
};

export type CatQLikertOption = {
  value: CatQLikertValue;
  label: string;
};

export type CatQContentStatus = "OFFICIAL_HULL_2019";
