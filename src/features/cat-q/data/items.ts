/**
 * Official CAT-Q item bank (Hull et al., 2019).
 *
 * Source: Online Appendix 1 to
 * Hull, L., Mandy, W., Lai, M.-C., Baron-Cohen, S., Allison, C., Smith, P., & Petrides, K. V. (2019).
 * Development and Validation of the Camouflaging Autistic Traits Questionnaire (CAT-Q).
 * Journal of Autism and Developmental Disorders, 49, 819–833.
 * https://doi.org/10.1007/s10803-018-3792-6
 *
 * Item wording copied verbatim from the publisher electronic supplementary material
 * (10803_2018_3792_MOESM1_ESM.docx). Do not paraphrase.
 */

import type { CatQItem, CatQLikertOption } from "../types";

export const CAT_Q_CONTENT_STATUS = "OFFICIAL_HULL_2019" as const;

export const CAT_Q_ATTRIBUTION =
  "Hull, L., Mandy, W., Lai, M.-C., Baron-Cohen, S., Allison, C., Smith, P., & Petrides, K. V. (2019). Development and Validation of the Camouflaging Autistic Traits Questionnaire (CAT-Q). Journal of Autism and Developmental Disorders, 49, 819–833." as const;

export const CAT_Q_INSTRUCTIONS =
  "Please read each statement below and choose the answer that best fits your experiences during social interactions." as const;

/** Maximum possible subscale / total scores (scored item range 1–7). */
export const CAT_Q_SCORE_MAXIMA = {
  total: 175,
  compensation: 63,
  masking: 56,
  assimilation: 56,
} as const;

export const CAT_Q_LIKERT_OPTIONS: CatQLikertOption[] = [
  { value: 1, label: "Strongly Disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Somewhat Disagree" },
  { value: 4, label: "Neither Agree nor Disagree" },
  { value: 5, label: "Somewhat Agree" },
  { value: 6, label: "Agree" },
  { value: 7, label: "Strongly Agree" },
];

export const CAT_Q_ITEMS: CatQItem[] = [
  {
    id: "catq-01",
    itemNumber: 1,
    text: "When I am interacting with someone, I deliberately copy their body language or facial expressions",
    subscale: "compensation",
    reverseScored: false,
  },
  {
    id: "catq-02",
    itemNumber: 2,
    text: "I monitor my body language or facial expressions so that I appear relaxed",
    subscale: "masking",
    reverseScored: false,
  },
  {
    id: "catq-03",
    itemNumber: 3,
    text: "I rarely feel the need to put on an act in order to get through a social situation",
    subscale: "assimilation",
    reverseScored: true,
  },
  {
    id: "catq-04",
    itemNumber: 4,
    text: "I have developed a script to follow in social situations (for example, a list of questions or topics of conversation)",
    subscale: "compensation",
    reverseScored: false,
  },
  {
    id: "catq-05",
    itemNumber: 5,
    text: "I will repeat phrases that I have heard others say in the exact same way that I first heard them",
    subscale: "compensation",
    reverseScored: false,
  },
  {
    id: "catq-06",
    itemNumber: 6,
    text: "I adjust my body language or facial expressions so that I appear interested by the person I am interacting with",
    subscale: "masking",
    reverseScored: false,
  },
  {
    id: "catq-07",
    itemNumber: 7,
    text: "In social situations, I feel like I’m ‘performing’ rather than being myself",
    subscale: "assimilation",
    reverseScored: false,
  },
  {
    id: "catq-08",
    itemNumber: 8,
    text: "In my own social interactions, I use behaviours that I have learned from watching other people interacting",
    subscale: "compensation",
    reverseScored: false,
  },
  {
    id: "catq-09",
    itemNumber: 9,
    text: "I always think about the impression I make on other people",
    subscale: "masking",
    reverseScored: false,
  },
  {
    id: "catq-10",
    itemNumber: 10,
    text: "I need the support of other people in order to socialise",
    subscale: "assimilation",
    reverseScored: false,
  },
  {
    id: "catq-11",
    itemNumber: 11,
    text: "I practice my facial expressions and body language to make sure they look natural",
    subscale: "compensation",
    reverseScored: false,
  },
  {
    id: "catq-12",
    itemNumber: 12,
    text: "I don’t feel the need to make eye contact with other people if I don’t want to",
    subscale: "masking",
    reverseScored: true,
  },
  {
    id: "catq-13",
    itemNumber: 13,
    text: "I have to force myself to interact with people when I am in social situations",
    subscale: "assimilation",
    reverseScored: false,
  },
  {
    id: "catq-14",
    itemNumber: 14,
    text: "I have tried to improve my understanding of social skills by watching other people",
    subscale: "compensation",
    reverseScored: false,
  },
  {
    id: "catq-15",
    itemNumber: 15,
    text: "I monitor my body language or facial expressions so that I appear interested by the person I am interacting with",
    subscale: "masking",
    reverseScored: false,
  },
  {
    id: "catq-16",
    itemNumber: 16,
    text: "When in social situations, I try to find ways to avoid interacting with others",
    subscale: "assimilation",
    reverseScored: false,
  },
  {
    id: "catq-17",
    itemNumber: 17,
    text: "I have researched the rules of social interactions (for example, by studying psychology or reading books on human behaviour) to improve my own social skills",
    subscale: "compensation",
    reverseScored: false,
  },
  {
    id: "catq-18",
    itemNumber: 18,
    text: "I am always aware of the impression I make on other people",
    subscale: "masking",
    reverseScored: false,
  },
  {
    id: "catq-19",
    itemNumber: 19,
    text: "I feel free to be myself when I am with other people",
    subscale: "assimilation",
    reverseScored: true,
  },
  {
    id: "catq-20",
    itemNumber: 20,
    text: "I learn how people use their bodies and faces to interact by watching television or films, or by reading fiction",
    subscale: "compensation",
    reverseScored: false,
  },
  {
    id: "catq-21",
    itemNumber: 21,
    text: "I adjust my body language or facial expressions so that I appear relaxed",
    subscale: "masking",
    reverseScored: false,
  },
  {
    id: "catq-22",
    itemNumber: 22,
    text: "When talking to other people, I feel like the conversation flows naturally",
    subscale: "assimilation",
    reverseScored: true,
  },
  {
    id: "catq-23",
    itemNumber: 23,
    text: "I have spent time learning social skills from television shows and films, and try to use these in my interactions",
    subscale: "compensation",
    reverseScored: false,
  },
  {
    id: "catq-24",
    itemNumber: 24,
    text: "In social interactions, I do not pay attention to what my face or body are doing",
    subscale: "masking",
    reverseScored: true,
  },
  {
    id: "catq-25",
    itemNumber: 25,
    text: "In social situations, I feel like I am pretending to be ‘normal’",
    subscale: "assimilation",
    reverseScored: false,
  },
];

export const CAT_Q_ITEM_COUNT = 25 as const;

export const CAT_Q_ITEM_IDS: string[] = CAT_Q_ITEMS.map((item) => item.id);

export function getCatQItem(id: string): CatQItem | undefined {
  return CAT_Q_ITEMS.find((item) => item.id === id);
}

export function isCatQContentConfigured(): boolean {
  return CAT_Q_CONTENT_STATUS === "OFFICIAL_HULL_2019";
}

