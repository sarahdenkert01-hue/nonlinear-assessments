import { describe, expect, it } from "vitest";
import { generateTemplateClinicalSynthesis } from "./synthesize-summary";

describe("generateTemplateClinicalSynthesis", () => {
  it("lists confirmed findings with observation sections without diagnostic language", () => {
    const draft = generateTemplateClinicalSynthesis({
      domainLabel: "Executive Function",
      domainDescription: "Planning, organization, and task initiation.",
      findings: [
        {
          id: "f1",
          code: "task-paralysis",
          label: "Task paralysis",
          category: "executive",
          status: "ACCEPTED",
          hits: 3,
          total: 4,
          evidenceCount: 2,
          evidence: [
            { id: "e1", itemId: "q1", text: "Starting tasks is hard", answer: "Often" },
          ],
        },
      ],
      supplementalEvidence: [],
    });

    expect(draft).toMatch(/Task paralysis/i);
    expect(draft).toMatch(/OBSERVATIONS/i);
    expect(draft.toLowerCase()).not.toMatch(/diagnos|autism|adhd/);
  });
});
