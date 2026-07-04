import { describe, expect, it } from "vitest";
import { generateTemplateQuestions } from "./suggest-questions";

describe("generateTemplateQuestions", () => {
  it("includes domain-specific executive function questions", () => {
    const draft = generateTemplateQuestions({
      domainId: "executive-function",
      domainLabel: "Executive Function",
      findingCodes: ["task-paralysis"],
      findingLabels: ["Task paralysis"],
      opportunities: ["Interview opportunity: explore this domain"],
      presentSources: ["FINDING"],
    });
    expect(draft).toMatch(/When did difficulties/i);
    expect(draft).toMatch(/task initiation/i);
    expect(draft.toLowerCase()).not.toMatch(/\bdiagnosis\b|confirm adhd|confirm autism/);
  });

  it("includes masking questions for masking findings", () => {
    const draft = generateTemplateQuestions({
      domainId: "masking-adaptation",
      domainLabel: "Masking & Social Adaptation",
      findingCodes: ["masking"],
      findingLabels: ["Masking"],
      opportunities: [],
      presentSources: ["FINDING"],
    });
    expect(draft).toMatch(/masking/i);
  });
});
