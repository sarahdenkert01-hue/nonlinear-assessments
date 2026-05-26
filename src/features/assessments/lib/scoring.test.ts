import { describe, expect, it } from "vitest";
import {
  computeThemeScores,
  isQuestionTriggered,
  resolveThemesWithOverrides,
} from "./scoring";
import type { AssessmentQuestion } from "../types";

const maskingPrimary: AssessmentQuestion = {
  id: "test-q",
  text: "Test",
  format: "frequency",
  themes: ["masking"],
  weight: "primary",
  flag: { frequency: ["Often", "Very Often"] },
};

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

  it("does not flag convergence themes on only one hit", () => {
    const scores = computeThemeScores({ q08: "Often" });
    const executive = scores.find((t) => t.id === "executive-dysfunction");
    expect(executive?.hits).toBe(1);
    expect(executive?.flagged).toBe(false);
  });

  it("flags convergence themes when two mapped items are endorsed", () => {
    const scores = computeThemeScores({ q07: "Often", q10: "Very Often" });
    const executive = scores.find((t) => t.id === "executive-dysfunction");
    expect(executive?.hits).toBe(2);
    expect(executive?.flagged).toBe(true);
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
