import { describe, expect, it } from "vitest";
import {
  computeThemeScores,
  countAnsweredQuestions,
  isQuestionTriggered,
  resolveThemesWithOverrides,
} from "./scoring";
import type { AssessmentQuestion } from "../types";
import { QUESTIONS } from "../data/questions";
import { THEMES, getThemeById } from "../data/themes";
import { isAssessmentQuestion } from "../types";

const maskingPrimary: AssessmentQuestion = {
  id: "test-q",
  text: "Test",
  format: "frequency",
  themes: ["masking"],
  weight: "primary",
  flag: { frequency: ["Often", "Very Often"] },
};

const OFTEN = "Often";
const AGREE = "Agree";

describe("isQuestionTriggered", () => {
  it("flags frequency answers in the threshold list", () => {
    expect(isQuestionTriggered(maskingPrimary, "Often")).toBe(true);
    expect(isQuestionTriggered(maskingPrimary, "Sometimes")).toBe(false);
  });

  it("returns false for open questions", () => {
    expect(
      isQuestionTriggered(
        { ...maskingPrimary, format: "open", flag: undefined },
        "anything",
      ),
    ).toBe(false);
  });
});

describe("computeThemeScores", () => {
  it("flags high-sensitivity themes from a single endorsed item", () => {
    const scores = computeThemeScores({ q01: "Often" });
    const masking = scores.find((t) => t.id === "masking");
    expect(masking?.flagged).toBe(true);
    expect(masking?.hits).toBe(1);
  });

  it("does not flag executive-dysfunction from q08 alone (legacy ADHD theme)", () => {
    const scores = computeThemeScores({ q08: "Often" });
    const executive = scores.find((t) => t.id === "executive-dysfunction");
    expect(executive?.hits ?? 0).toBe(0);
    expect(executive?.flagged).toBe(false);
  });

  it("does not auto-flag ADHD executive-dysfunction or task-paralysis from q07/q10 alone", () => {
    const scores = computeThemeScores({ q07: "Often", q10: "Very Often" });
    expect(scores.find((t) => t.id === "executive-dysfunction")?.flagged).toBe(false);
    expect(scores.find((t) => t.id === "task-paralysis")?.flagged).toBe(false);
    const initiation = scores.find((t) => t.id === "task-initiation-state-dependence");
    expect(initiation?.hits).toBe(2);
    expect(initiation?.flagged).toBe(true);
    expect(initiation?.category).toBe("Both");
  });

  it("does not flag themes when the client selects Not sure", () => {
    const scores = computeThemeScores({ q01: "Not sure" });
    const masking = scores.find((t) => t.id === "masking");
    expect(masking?.flagged).toBe(false);
    expect(masking?.hits).toBe(0);
  });
});

describe("EF / inertia expansion scoring", () => {
  it("includes q50–q62 in the question bank", () => {
    const ids = QUESTIONS.filter(isAssessmentQuestion).map((q) => q.id);
    for (let n = 50; n <= 62; n++) {
      expect(ids).toContain(`q${n}`);
    }
  });

  it("flags switching-engagement-inertia from q50/q51/q53", () => {
    const scores = computeThemeScores({
      q50: OFTEN,
      q51: OFTEN,
      q53: OFTEN,
    });
    const theme = scores.find((t) => t.id === "switching-engagement-inertia");
    expect(theme?.flagged).toBe(true);
    expect(theme?.hits).toBeGreaterThanOrEqual(2);
    expect(theme?.category).toBe("Both");
  });

  it("flags executive-functioning-activation from q54–q57", () => {
    const scores = computeThemeScores({
      q54: OFTEN,
      q55: OFTEN,
      q56: OFTEN,
      q57: OFTEN,
    });
    const theme = scores.find((t) => t.id === "executive-functioning-activation");
    expect(theme?.flagged).toBe(true);
    expect(theme?.hits).toBeGreaterThanOrEqual(2);
    expect(theme?.category).toBe("Both");
  });

  it("flags task-initiation-state-dependence from q52/q58/q59/q60", () => {
    const scores = computeThemeScores({
      q52: OFTEN,
      q58: OFTEN,
      q59: OFTEN,
      q60: OFTEN,
    });
    const theme = scores.find((t) => t.id === "task-initiation-state-dependence");
    expect(theme?.flagged).toBe(true);
    expect(theme?.category).toBe("Both");
  });

  it("lets q60/q61 contribute to functional-inconsistency", () => {
    const scores = computeThemeScores({ q60: OFTEN, q61: OFTEN });
    const theme = scores.find((t) => t.id === "functional-inconsistency");
    expect(theme?.hits).toBe(2);
    expect(theme?.flagged).toBe(true);
    expect(theme?.category).toBe("Both");
  });

  it("does not let q62 independently produce ADHD or Autism findings", () => {
    const scores = computeThemeScores({ q62: AGREE });
    const flagged = scores.filter((t) => t.flagged);
    expect(flagged).toHaveLength(0);
    expect(scores.every((t) => t.hits === 0 || !t.flagged)).toBe(true);
    for (const t of scores) {
      if (t.category === "ADHD" || t.category === "Autism") {
        expect(t.flagged).toBe(false);
        expect(t.hits).toBe(0);
      }
    }
  });

  it("keeps unrelated themes scoring normally", () => {
    const scores = computeThemeScores({ q01: OFTEN });
    expect(scores.find((t) => t.id === "masking")?.flagged).toBe(true);
  });

  it("registers new descriptive themes as Both", () => {
    expect(getThemeById("executive-functioning-activation")?.category).toBe("Both");
    expect(getThemeById("task-initiation-state-dependence")?.category).toBe("Both");
    expect(getThemeById("switching-engagement-inertia")?.category).toBe("Both");
    expect(THEMES.some((t) => t.id === "executive-functioning-activation")).toBe(true);
  });
});

describe("countAnsweredQuestions", () => {
  it("excludes optional chapter reflection keys from the count", () => {
    expect(
      countAnsweredQuestions({
        q01: "Often",
        "reflection:0": "Something personal",
      }),
    ).toBe(1);
  });
});

describe("resolveThemesWithOverrides", () => {
  it("lets clinicians include a theme the algorithm did not flag", () => {
    const scores = computeThemeScores({});
    const resolved = resolveThemesWithOverrides(scores, {
      "masking-fatigue": "include",
    });
    const theme = resolved.find((t) => t.id === "masking-fatigue");
    expect(theme?.included).toBe(true);
    expect(theme?.source).toBe("clinician-include");
  });

  it("lets clinicians exclude a flagged theme", () => {
    const scores = computeThemeScores({ q01: "Often" });
    const resolved = resolveThemesWithOverrides(scores, { masking: "exclude" });
    const theme = resolved.find((t) => t.id === "masking");
    expect(theme?.flagged).toBe(true);
    expect(theme?.included).toBe(false);
    expect(theme?.source).toBe("clinician-exclude");
  });
});
