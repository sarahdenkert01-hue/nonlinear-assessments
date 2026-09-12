import { describe, expect, it } from "vitest";
import { generateTemplateQuestionTexts } from "./suggest-questions";
import { buildTemplateDifferentialPromptsForTest } from "./suggest-differentials";

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
    expect(questions.some((q) => /task initiation|stuck|urgency|interrupted/i.test(q))).toBe(
      true,
    );
  });

  it("includes prompts for new EF finding codes", () => {
    const questions = generateTemplateQuestionTexts({
      domainId: "executive-function",
      domainLabel: "Executive Function",
      findingCodes: [
        "executive-functioning-activation",
        "task-initiation-state-dependence",
        "switching-engagement-inertia",
      ],
      findingLabels: [
        "Executive Functioning & Activation",
        "Task Initiation & State Dependence",
        "Switching & Engagement Inertia",
      ],
      opportunities: [],
      presentSources: ["FINDING"],
    });
    expect(questions.some((q) => /sequencing|prioritizing|time/i.test(q))).toBe(true);
    expect(questions.some((q) => /urgency|novelty|another person|load/i.test(q))).toBe(true);
    expect(questions.some((q) => /shifting|interruption/i.test(q))).toBe(true);
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

describe("executive-function differentials", () => {
  it("includes ADHD vs inertia vs acquired-cause prompts", () => {
    const prompts = buildTemplateDifferentialPromptsForTest({
      domainLabel: "Executive Function",
      domainDescription: "Planning, initiation, task management, and cognitive organization.",
      findings: [],
      acquiredEfChangeEndorsed: true,
    });
    expect(prompts.some((p) => /ADHD/i.test(p))).toBe(true);
    expect(prompts.some((p) => /inertia|transition/i.test(p))).toBe(true);
    expect(prompts.some((p) => /acquired|life change|developmental/i.test(p))).toBe(true);
    expect(prompts.some((p) => /pain|burnout|sleep|trauma/i.test(p))).toBe(true);
  });
});
