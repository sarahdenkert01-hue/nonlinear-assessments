import { describe, expect, it } from "vitest";
import { generateTemplateQuestionTexts } from "./suggest-questions";

describe("generateTemplateQuestionTexts", () => {
  it("includes domain-specific executive function questions", () => {
    const questions = generateTemplateQuestionTexts({
      domainId: "executive-function",
      domainLabel: "Executive Function",
      findingCodes: ["task-paralysis"],
      findingLabels: ["Task paralysis"],
      opportunities: ["Interview opportunity: explore this domain"],
      presentSources: ["FINDING"],
    });
    expect(questions.some((q) => /When did difficulties/i.test(q))).toBe(true);
    expect(questions.some((q) => /task initiation/i.test(q))).toBe(true);
  });

  it("includes masking questions for masking findings", () => {
    const questions = generateTemplateQuestionTexts({
      domainId: "masking-adaptation",
      domainLabel: "Masking & Social Adaptation",
      findingCodes: ["masking"],
      findingLabels: ["Masking"],
      opportunities: [],
      presentSources: ["FINDING"],
    });
    expect(questions.some((q) => /masking/i.test(q))).toBe(true);
  });
});
