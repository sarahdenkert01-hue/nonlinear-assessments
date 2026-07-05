import { describe, expect, it } from "vitest";
import {
  hasFormulationStarted,
  pullUncertaintyFromOpportunities,
  resolveClinicalFormulationDraft,
  seedCoreFromSynthesis,
} from "./clinical-formulation";

describe("clinical-formulation", () => {
  it("falls back to clinicalNotes for clinicalConsiderations", () => {
    const draft = resolveClinicalFormulationDraft(null, "Private reasoning note");
    expect(draft.clinicalConsiderations).toBe("Private reasoning note");
  });

  it("seeds core understanding from synthesis without touching other fields", () => {
    const next = seedCoreFromSynthesis(
      {
        coreUnderstanding: null,
        functionalImpact: "Existing impact",
        strengthsAdaptiveStrategies: null,
        remainingUncertainty: null,
        clinicalConsiderations: null,
      },
      "Synthesis text here.",
    );
    expect(next.coreUnderstanding).toBe("Synthesis text here.");
    expect(next.functionalImpact).toBe("Existing impact");
  });

  it("pulls opportunities into remaining uncertainty", () => {
    const next = pullUncertaintyFromOpportunities(
      {
        coreUnderstanding: null,
        functionalImpact: null,
        strengthsAdaptiveStrategies: null,
        remainingUncertainty: null,
        clinicalConsiderations: null,
      },
      [{ category: "interview", label: "Interview opportunity", items: ["Explore in interview"] }],
    );
    expect(next.remainingUncertainty).toMatch(/Interview opportunity/i);
    expect(next.remainingUncertainty).toMatch(/Explore in interview/);
  });

  it("detects formulation started when any field has content", () => {
    expect(
      hasFormulationStarted(
        resolveClinicalFormulationDraft(
          { coreUnderstanding: "Something" },
          null,
        ),
      ),
    ).toBe(true);
  });
});
