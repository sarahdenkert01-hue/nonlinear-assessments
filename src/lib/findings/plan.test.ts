import { describe, expect, it } from "vitest";
import {
  computeThemeScores,
  getIncludedThemes,
  resolveThemesWithOverrides,
  type ClinicianOverrides,
} from "@/features/assessments";
import { isIncludedStatus, planFindings } from "./plan";

// The set of finding codes that end up in the report must match the old theme-inclusion logic.
function includedCodesFromPlan(
  answers: Record<string, string>,
  overrides: ClinicianOverrides = {},
): string[] {
  const scores = computeThemeScores(answers);
  return planFindings(scores, overrides)
    .filter((d) => isIncludedStatus(d.status))
    .map((d) => d.code)
    .sort();
}

function includedCodesFromLegacy(
  answers: Record<string, string>,
  overrides: ClinicianOverrides = {},
): string[] {
  const scores = computeThemeScores(answers);
  const resolved = resolveThemesWithOverrides(scores, overrides);
  return getIncludedThemes(resolved)
    .map((t) => t.id)
    .sort();
}

describe("planFindings — parity with legacy theme inclusion", () => {
  it("matches for flagged themes with no overrides", () => {
    const answers = { q01: "Often", q07: "Often", q10: "Very Often" };
    expect(includedCodesFromPlan(answers)).toEqual(includedCodesFromLegacy(answers));
  });

  it("matches when a clinician excludes a flagged theme", () => {
    const answers = { q01: "Often" };
    const overrides: ClinicianOverrides = { masking: "exclude" };
    expect(includedCodesFromPlan(answers, overrides)).toEqual(
      includedCodesFromLegacy(answers, overrides),
    );
  });

  it("matches when a clinician includes an unflagged theme", () => {
    const answers = {};
    const overrides: ClinicianOverrides = { "masking-fatigue": "include" };
    expect(includedCodesFromPlan(answers, overrides)).toEqual(
      includedCodesFromLegacy(answers, overrides),
    );
  });
});

describe("planFindings — status + source transitions", () => {
  it("proposes flagged themes from the algorithm with no confidence implied", () => {
    const drafts = planFindings(computeThemeScores({ q01: "Often" }));
    const masking = drafts.find((d) => d.code === "masking");
    expect(masking?.status).toBe("PROPOSED");
    expect(masking?.source).toBe("ALGORITHM");
    expect(masking?.hits).toBe(1);
  });

  it("marks a clinician-included unflagged theme as ACCEPTED / CLINICIAN", () => {
    const drafts = planFindings(computeThemeScores({}), {
      "masking-fatigue": "include",
    });
    const finding = drafts.find((d) => d.code === "masking-fatigue");
    expect(finding?.status).toBe("ACCEPTED");
    expect(finding?.source).toBe("CLINICIAN");
  });

  it("keeps an excluded flagged theme on record as EXCLUDED / ALGORITHM", () => {
    const drafts = planFindings(computeThemeScores({ q01: "Often" }), {
      masking: "exclude",
    });
    const masking = drafts.find((d) => d.code === "masking");
    expect(masking?.status).toBe("EXCLUDED");
    expect(masking?.source).toBe("ALGORITHM");
    expect(isIncludedStatus(masking!.status)).toBe(false);
  });

  it("does not create a finding for an unflagged theme with no override", () => {
    const drafts = planFindings(computeThemeScores({}));
    expect(drafts).toHaveLength(0);
  });
});
