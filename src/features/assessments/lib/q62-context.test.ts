import { describe, expect, it } from "vitest";
import { QUESTIONS } from "../data/questions";
import { computeThemeScores } from "./scoring";
import { planFindings } from "@/lib/findings/plan";
import { isAssessmentQuestion } from "../types";
import {
  q62StrengthVerb,
  q62ThemeIds,
  resolveQ62AcquiredEfContext,
  resolveQ62AcquiredEfContextFromAnswers,
} from "./q62-context";

const OFTEN = "Often";

describe("q60 burnout mapping safety", () => {
  it("does not map q60 to neurodivergent-burnout", () => {
    const q60 = QUESTIONS.find((q) => isAssessmentQuestion(q) && q.id === "q60");
    expect(q60 && isAssessmentQuestion(q60) && q60.themes).toEqual([
      "task-initiation-state-dependence",
      "functional-inconsistency",
    ]);
    expect(q60 && isAssessmentQuestion(q60) && q60.themes).not.toContain(
      "neurodivergent-burnout",
    );
  });

  it("does not let q60 contribute hits to neurodivergent-burnout", () => {
    const withQ60 = computeThemeScores({ q60: OFTEN });
    const burnout = withQ60.find((t) => t.id === "neurodivergent-burnout")!;
    expect(burnout.hits).toBe(0);
    expect(burnout.flagged).toBe(false);
  });

  it("cannot flag burnout from q60 plus one other burnout item alone", () => {
    // q11 is a burnout-mapped item; with former q60 mapping this would be 2 hits.
    const scores = computeThemeScores({ q60: OFTEN, q11: OFTEN });
    const burnout = scores.find((t) => t.id === "neurodivergent-burnout")!;
    expect(burnout.hits).toBe(1);
    expect(burnout.flagged).toBe(false);
    expect(planFindings(scores).some((d) => d.code === "neurodivergent-burnout")).toBe(
      false,
    );
  });

  it("still allows burnout when two non-q60 burnout items endorse", () => {
    const scores = computeThemeScores({ q09: OFTEN, q12: OFTEN });
    const burnout = scores.find((t) => t.id === "neurodivergent-burnout")!;
    expect(burnout.hits).toBeGreaterThanOrEqual(2);
    expect(burnout.flagged).toBe(true);
  });

  it("still contributes to task-initiation-state-dependence", () => {
    const scores = computeThemeScores({ q52: OFTEN, q60: OFTEN });
    const theme = scores.find((t) => t.id === "task-initiation-state-dependence")!;
    expect(theme.hits).toBe(2);
    expect(theme.flagged).toBe(true);
  });

  it("still contributes to functional-inconsistency", () => {
    const scores = computeThemeScores({ q60: OFTEN, q61: OFTEN });
    const theme = scores.find((t) => t.id === "functional-inconsistency")!;
    expect(theme.hits).toBe(2);
    expect(theme.flagged).toBe(true);
  });
});

describe("q62 non-scored clinical context", () => {
  it("keeps q62 themes empty", () => {
    expect(q62ThemeIds()).toEqual([]);
  });

  it("resolves Agree and Strongly agree with correct strength", () => {
    expect(resolveQ62AcquiredEfContext("Agree")).toEqual({ strength: "Agree" });
    expect(resolveQ62AcquiredEfContext("Strongly agree")).toEqual({
      strength: "Strongly agree",
    });
    expect(q62StrengthVerb("Agree")).toBe("agreed");
    expect(q62StrengthVerb("Strongly agree")).toBe("strongly agreed");
  });

  it("does not show context for non-endorsed answers", () => {
    expect(resolveQ62AcquiredEfContext("Disagree")).toBeNull();
    expect(resolveQ62AcquiredEfContext("Not sure")).toBeNull();
    expect(resolveQ62AcquiredEfContext("")).toBeNull();
    expect(resolveQ62AcquiredEfContext(undefined)).toBeNull();
    expect(resolveQ62AcquiredEfContextFromAnswers({})).toBeNull();
  });

  it("does not create findings from q62 endorsement", () => {
    const scores = computeThemeScores({ q62: "Strongly agree" });
    expect(planFindings(scores)).toHaveLength(0);
    expect(scores.every((t) => t.hits === 0)).toBe(true);
  });
});
