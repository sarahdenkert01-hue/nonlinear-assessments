import { describe, expect, it } from "vitest";
import { generateTemplateEvidenceSummary } from "./synthesize-summary";

describe("generateTemplateEvidenceSummary", () => {
  it("lists confirmed findings and evidence without diagnostic language", () => {
    const draft = generateTemplateEvidenceSummary({
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
    expect(draft).toMatch(/Starting tasks is hard/i);
    expect(draft.toLowerCase()).not.toMatch(/diagnos|autism|adhd/);
  });
});
