import { describe, expect, it } from "vitest";
import {
  CAT_Q_CONTENT_STATUS,
  CAT_Q_ITEMS,
  CAT_Q_ITEM_COUNT,
  computeCatQScores,
  isCatQComplete,
  isCatQContentConfigured,
  isValidCatQLikert,
  missingRequiredCatQItemIds,
  scoredItemValue,
  type CatQAnswers,
  type CatQLikertValue,
} from "@/features/cat-q";
import {
  ASSIGNMENT_PACKAGES,
  MODULE_KEYS,
  areRequiredModulesSubmitted,
  filterModuleKeysToAdd,
  getDefaultClientModules,
  getModulesForPackage,
  getModuleDefinition,
  isModuleRequiredForEpisode,
  resolveTokenBearerModuleKey,
  shouldUnlockEpisodeOnModuleSubmit,
  validateModulePayload,
} from "@/lib/modules";

describe("CAT-Q module registration", () => {
  it("registers cat-q with structured-measure metadata", () => {
    const def = getModuleDefinition(MODULE_KEYS.CAT_Q);
    expect(def).toBeDefined();
    expect(def?.moduleKey).toBe("cat-q");
    expect(def?.shortTitle).toBe("CAT-Q");
    expect(def?.renderer).toBe("cat-q-form");
    expect(def?.title).toContain("Camouflaging Autistic Traits Questionnaire");
  });

  it("keeps Nonlinear default package free of CAT-Q", () => {
    const defaults = getDefaultClientModules().map((m) => m.moduleKey);
    expect(defaults).toEqual([
      MODULE_KEYS.SCREENER,
      MODULE_KEYS.LIFE_MAP,
      MODULE_KEYS.GUIDED_REFLECTION,
    ]);
    expect(defaults).not.toContain(MODULE_KEYS.CAT_Q);
  });

  it("exposes Nonlinear and CAT-Q assignment packages", () => {
    expect(ASSIGNMENT_PACKAGES.map((p) => p.id)).toEqual(["nonlinear", "cat-q"]);
  });
});

describe("assignment packages and token bearer", () => {
  it("creates CAT-Q-only module list for cat-q package", () => {
    const modules = getModulesForPackage("cat-q");
    expect(modules.map((m) => m.moduleKey)).toEqual([MODULE_KEYS.CAT_Q]);
  });

  it("preserves Nonlinear package for default nonlinear assignment", () => {
    const modules = getModulesForPackage("nonlinear");
    expect(modules.map((m) => m.moduleKey)).toEqual([
      MODULE_KEYS.SCREENER,
      MODULE_KEYS.LIFE_MAP,
      MODULE_KEYS.GUIDED_REFLECTION,
    ]);
  });

  it("puts the intake token on CAT-Q when screener is absent", () => {
    expect(resolveTokenBearerModuleKey([MODULE_KEYS.CAT_Q])).toBe(MODULE_KEYS.CAT_Q);
  });

  it("prefers screener as token bearer when present", () => {
    expect(
      resolveTokenBearerModuleKey([
        MODULE_KEYS.CAT_Q,
        MODULE_KEYS.SCREENER,
        MODULE_KEYS.LIFE_MAP,
      ]),
    ).toBe(MODULE_KEYS.SCREENER);
  });

  it("unlocks episode on CAT-Q submit only when no screener is assigned", () => {
    expect(shouldUnlockEpisodeOnModuleSubmit(MODULE_KEYS.CAT_Q, [MODULE_KEYS.CAT_Q])).toBe(
      true,
    );
    expect(
      shouldUnlockEpisodeOnModuleSubmit(MODULE_KEYS.CAT_Q, [
        MODULE_KEYS.SCREENER,
        MODULE_KEYS.CAT_Q,
      ]),
    ).toBe(false);
    expect(
      shouldUnlockEpisodeOnModuleSubmit(MODULE_KEYS.SCREENER, [
        MODULE_KEYS.SCREENER,
        MODULE_KEYS.CAT_Q,
      ]),
    ).toBe(true);
  });

  it("prevents duplicate CAT-Q assignment keys", () => {
    expect(
      filterModuleKeysToAdd([MODULE_KEYS.SCREENER, MODULE_KEYS.CAT_Q], [MODULE_KEYS.CAT_Q]),
    ).toEqual([]);
    expect(
      filterModuleKeysToAdd([MODULE_KEYS.SCREENER], [MODULE_KEYS.CAT_Q, MODULE_KEYS.CAT_Q]),
    ).toEqual([MODULE_KEYS.CAT_Q]);
  });

  it("allows adding CAT-Q to an existing Nonlinear episode key set", () => {
    expect(
      filterModuleKeysToAdd(
        [MODULE_KEYS.SCREENER, MODULE_KEYS.LIFE_MAP, MODULE_KEYS.GUIDED_REFLECTION],
        [MODULE_KEYS.CAT_Q],
      ),
    ).toEqual([MODULE_KEYS.CAT_Q]);
  });
});

describe("CAT-Q response validation", () => {
  it("accepts integer Likert values 1–7", () => {
    const result = validateModulePayload(MODULE_KEYS.CAT_Q, {
      "catq-01": 1,
      "catq-02": 7,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data["catq-01"]).toBe(1);
      expect(result.data["catq-02"]).toBe(7);
    }
  });

  it("coerces numeric strings to integers", () => {
    const result = validateModulePayload(MODULE_KEYS.CAT_Q, { "catq-01": "4" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data["catq-01"]).toBe(4);
  });

  it("rejects values below 1", () => {
    expect(validateModulePayload(MODULE_KEYS.CAT_Q, { "catq-01": 0 }).ok).toBe(false);
  });

  it("rejects values above 7", () => {
    expect(validateModulePayload(MODULE_KEYS.CAT_Q, { "catq-01": 8 }).ok).toBe(false);
  });

  it("rejects non-integer values", () => {
    expect(validateModulePayload(MODULE_KEYS.CAT_Q, { "catq-01": 3.5 }).ok).toBe(false);
    expect(validateModulePayload(MODULE_KEYS.CAT_Q, { "catq-01": "agree" }).ok).toBe(false);
  });

  it("rejects unknown item ids", () => {
    expect(validateModulePayload(MODULE_KEYS.CAT_Q, { "not-an-item": 3 }).ok).toBe(false);
  });

  it("exposes isValidCatQLikert helpers", () => {
    expect(isValidCatQLikert(1)).toBe(true);
    expect(isValidCatQLikert(7)).toBe(true);
    expect(isValidCatQLikert(0)).toBe(false);
    expect(isValidCatQLikert(8)).toBe(false);
    expect(isValidCatQLikert(2.5)).toBe(false);
    expect(isValidCatQLikert("3")).toBe(false);
  });
});

describe("CAT-Q completeness", () => {
  it("requires all 25 items before complete", () => {
    expect(CAT_Q_ITEMS).toHaveLength(CAT_Q_ITEM_COUNT);
    expect(isCatQComplete({}, CAT_Q_ITEMS)).toBe(false);
    expect(missingRequiredCatQItemIds({}, CAT_Q_ITEMS)).toHaveLength(25);

    const partial: CatQAnswers = { "catq-01": 4 };
    expect(isCatQComplete(partial, CAT_Q_ITEMS)).toBe(false);
    expect(missingRequiredCatQItemIds(partial, CAT_Q_ITEMS).length).toBe(24);
  });

  it("is complete when every item has a valid Likert value", () => {
    const answers: CatQAnswers = {};
    for (const item of CAT_Q_ITEMS) {
      answers[item.id] = 4;
    }
    expect(isCatQComplete(answers, CAT_Q_ITEMS)).toBe(true);
    expect(missingRequiredCatQItemIds(answers, CAT_Q_ITEMS)).toEqual([]);
  });
});

describe("CAT-Q configuration integrity (Hull et al. 2019)", () => {
  it("has exactly 25 items with stable ids and unique item numbers 1–25", () => {
    expect(CAT_Q_ITEMS).toHaveLength(25);
    expect(CAT_Q_ITEM_COUNT).toBe(25);
    expect(CAT_Q_CONTENT_STATUS).toBe("OFFICIAL_HULL_2019");
    expect(isCatQContentConfigured()).toBe(true);

    const numbers = CAT_Q_ITEMS.map((i) => i.itemNumber).sort((a, b) => a - b);
    expect(numbers).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));

    const ids = CAT_Q_ITEMS.map((i) => i.id);
    expect(ids).toEqual(
      Array.from({ length: 25 }, (_, i) => `catq-${String(i + 1).padStart(2, "0")}`),
    );
    expect(new Set(ids).size).toBe(25);
  });

  it("maps subscales and reverse flags exactly", () => {
    const byNumber = (n: number) => CAT_Q_ITEMS.find((i) => i.itemNumber === n)!;

    const compensation = CAT_Q_ITEMS.filter((i) => i.subscale === "compensation").map(
      (i) => i.itemNumber,
    );
    const masking = CAT_Q_ITEMS.filter((i) => i.subscale === "masking").map(
      (i) => i.itemNumber,
    );
    const assimilation = CAT_Q_ITEMS.filter((i) => i.subscale === "assimilation").map(
      (i) => i.itemNumber,
    );
    const reversed = CAT_Q_ITEMS.filter((i) => i.reverseScored).map((i) => i.itemNumber);

    expect(compensation).toEqual([1, 4, 5, 8, 11, 14, 17, 20, 23]);
    expect(masking).toEqual([2, 6, 9, 12, 15, 18, 21, 24]);
    expect(assimilation).toEqual([3, 7, 10, 13, 16, 19, 22, 25]);
    expect(reversed).toEqual([3, 12, 19, 22, 24]);

    expect(compensation).toHaveLength(9);
    expect(masking).toHaveLength(8);
    expect(assimilation).toHaveLength(8);
    expect(reversed).toHaveLength(5);

    expect(byNumber(3).reverseScored).toBe(true);
    expect(byNumber(1).reverseScored).toBe(false);
  });

  it("uses non-placeholder official item wording", () => {
    expect(CAT_Q_ITEMS.every((i) => !i.text.includes("PLACEHOLDER"))).toBe(true);
    expect(CAT_Q_ITEMS[0]?.text).toBe(
      "When I am interacting with someone, I deliberately copy their body language or facial expressions",
    );
  });
});

describe("CAT-Q official scoring validation", () => {
  function fillAll(value: CatQLikertValue): CatQAnswers {
    const answers: CatQAnswers = {};
    for (const item of CAT_Q_ITEMS) answers[item.id] = value;
    return answers;
  }

  function answersForScoredValue(targetScored: CatQLikertValue): CatQAnswers {
    const answers: CatQAnswers = {};
    for (const item of CAT_Q_ITEMS) {
      answers[item.id] = (
        item.reverseScored ? (8 - targetScored) : targetScored
      ) as CatQLikertValue;
    }
    return answers;
  }

  it("TEST 1 — all responses = 1", () => {
    expect(computeCatQScores(fillAll(1), CAT_Q_ITEMS)).toEqual({
      total: 55,
      compensation: 9,
      masking: 20,
      assimilation: 26,
    });
  });

  it("TEST 2 — all responses = 7", () => {
    expect(computeCatQScores(fillAll(7), CAT_Q_ITEMS)).toEqual({
      total: 145,
      compensation: 63,
      masking: 44,
      assimilation: 38,
    });
  });

  it("TEST 3 — all responses = 4", () => {
    expect(computeCatQScores(fillAll(4), CAT_Q_ITEMS)).toEqual({
      total: 100,
      compensation: 36,
      masking: 32,
      assimilation: 32,
    });
  });

  it("TEST 4 — minimum theoretical scored result (every scored item = 1)", () => {
    expect(computeCatQScores(answersForScoredValue(1), CAT_Q_ITEMS)).toEqual({
      total: 25,
      compensation: 9,
      masking: 8,
      assimilation: 8,
    });
  });

  it("TEST 5 — maximum theoretical scored result (every scored item = 7)", () => {
    expect(computeCatQScores(answersForScoredValue(7), CAT_Q_ITEMS)).toEqual({
      total: 175,
      compensation: 63,
      masking: 56,
      assimilation: 56,
    });
  });

  it("TEST 6 — reverse scoring for items 3, 12, 19, 22, 24", () => {
    const reverseNums = [3, 12, 19, 22, 24];
    for (const n of reverseNums) {
      const item = CAT_Q_ITEMS.find((i) => i.itemNumber === n)!;
      expect(item.reverseScored).toBe(true);
      for (const raw of [1, 2, 3, 4, 5, 6, 7] as CatQLikertValue[]) {
        expect(scoredItemValue(item, raw)).toBe(8 - raw);
      }
    }
    const normal = CAT_Q_ITEMS.find((i) => i.itemNumber === 1)!;
    expect(normal.reverseScored).toBe(false);
    expect(scoredItemValue(normal, 1)).toBe(1);
    expect(scoredItemValue(normal, 4)).toBe(4);
    expect(scoredItemValue(normal, 7)).toBe(7);
  });
});

describe("CAT-Q isolation from Nonlinear findings", () => {
  it("does not place CAT-Q in the Nonlinear default package that drives findings", () => {
    // Findings generation reads nonlinear-screener only; CAT-Q must stay outside defaults.
    expect(getDefaultClientModules().some((m) => m.moduleKey === MODULE_KEYS.CAT_Q)).toBe(
      false,
    );
  });

  it("does not unlock Nonlinear findings path via CAT-Q when screener exists", () => {
    expect(
      shouldUnlockEpisodeOnModuleSubmit(MODULE_KEYS.CAT_Q, [
        MODULE_KEYS.SCREENER,
        MODULE_KEYS.CAT_Q,
      ]),
    ).toBe(false);
  });
});

describe("CAT-Q contextual required / journey completion", () => {
  const nonlinearKeys = [
    MODULE_KEYS.SCREENER,
    MODULE_KEYS.LIFE_MAP,
    MODULE_KEYS.GUIDED_REFLECTION,
  ];

  it("A: CAT-Q-only episode is incomplete before CAT-Q submission", () => {
    expect(isModuleRequiredForEpisode(MODULE_KEYS.CAT_Q, [MODULE_KEYS.CAT_Q])).toBe(true);
    expect(
      areRequiredModulesSubmitted([
        { moduleKey: MODULE_KEYS.CAT_Q, status: "NOT_STARTED" },
      ]),
    ).toBe(false);
    expect(
      areRequiredModulesSubmitted([
        { moduleKey: MODULE_KEYS.CAT_Q, status: "IN_PROGRESS" },
      ]),
    ).toBe(false);
  });

  it("B: CAT-Q-only episode is complete after CAT-Q submission", () => {
    expect(
      areRequiredModulesSubmitted([
        { moduleKey: MODULE_KEYS.CAT_Q, status: "SUBMITTED" },
      ]),
    ).toBe(true);
  });

  it("C: completed Nonlinear episode remains complete immediately after CAT-Q is added", () => {
    const completedNonlinear = nonlinearKeys.map((moduleKey) => ({
      moduleKey,
      status: "SUBMITTED",
    }));
    expect(areRequiredModulesSubmitted(completedNonlinear)).toBe(true);

    const withSupplementalCatQ = [
      ...completedNonlinear,
      { moduleKey: MODULE_KEYS.CAT_Q, status: "NOT_STARTED" },
    ];
    expect(isModuleRequiredForEpisode(MODULE_KEYS.CAT_Q, [
      ...nonlinearKeys,
      MODULE_KEYS.CAT_Q,
    ])).toBe(false);
    expect(areRequiredModulesSubmitted(withSupplementalCatQ)).toBe(true);
  });

  it("D: supplemental CAT-Q independently tracks NOT_STARTED / IN_PROGRESS / SUBMITTED", () => {
    const keys = [...nonlinearKeys, MODULE_KEYS.CAT_Q];
    expect(isModuleRequiredForEpisode(MODULE_KEYS.CAT_Q, keys)).toBe(false);

    for (const status of ["NOT_STARTED", "IN_PROGRESS", "SUBMITTED"] as const) {
      const modules = [
        ...nonlinearKeys.map((moduleKey) => ({ moduleKey, status: "SUBMITTED" })),
        { moduleKey: MODULE_KEYS.CAT_Q, status },
      ];
      // Package completion stays true regardless of supplemental CAT-Q status.
      expect(areRequiredModulesSubmitted(modules)).toBe(true);
      // CAT-Q itself still has its own status value.
      expect(modules.find((m) => m.moduleKey === MODULE_KEYS.CAT_Q)?.status).toBe(status);
    }
  });

  it("E: submitting supplemental CAT-Q does not alter Nonlinear completion semantics", () => {
    const before = [
      ...nonlinearKeys.map((moduleKey) => ({ moduleKey, status: "SUBMITTED" })),
      { moduleKey: MODULE_KEYS.CAT_Q, status: "IN_PROGRESS" },
    ];
    const after = [
      ...nonlinearKeys.map((moduleKey) => ({ moduleKey, status: "SUBMITTED" })),
      { moduleKey: MODULE_KEYS.CAT_Q, status: "SUBMITTED" },
    ];
    expect(areRequiredModulesSubmitted(before)).toBe(true);
    expect(areRequiredModulesSubmitted(after)).toBe(true);

    // Nonlinear modules alone still define package completion without CAT-Q.
    expect(
      areRequiredModulesSubmitted(
        nonlinearKeys.map((moduleKey) => ({ moduleKey, status: "SUBMITTED" })),
      ),
    ).toBe(true);
    expect(
      areRequiredModulesSubmitted([
        { moduleKey: MODULE_KEYS.SCREENER, status: "SUBMITTED" },
        { moduleKey: MODULE_KEYS.LIFE_MAP, status: "SUBMITTED" },
        { moduleKey: MODULE_KEYS.GUIDED_REFLECTION, status: "IN_PROGRESS" },
      ]),
    ).toBe(false);
  });

  it("preserves Nonlinear required flags when CAT-Q is absent", () => {
    expect(isModuleRequiredForEpisode(MODULE_KEYS.SCREENER, nonlinearKeys)).toBe(true);
    expect(isModuleRequiredForEpisode(MODULE_KEYS.LIFE_MAP, nonlinearKeys)).toBe(true);
    expect(
      isModuleRequiredForEpisode(MODULE_KEYS.GUIDED_REFLECTION, nonlinearKeys),
    ).toBe(true);
  });
});
