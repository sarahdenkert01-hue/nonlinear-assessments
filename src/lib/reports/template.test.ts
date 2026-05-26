import { describe, expect, it } from "vitest";
import { buildReportContext } from "./build-context";
import { generateTemplateReport } from "./template";

describe("generateTemplateReport", () => {
  it("produces narrative sections, not only item lists", () => {
    const context = buildReportContext({
      clientName: "Alex",
      answers: { q01: "Often" },
      overrides: {},
      resolvedThemes: [],
    });

    const report = generateTemplateReport(context);
    expect(report).toContain("Alex");
    expect(report).toContain("Clinical summary");
    expect(report).toContain("Theme formulations");
    expect(report).toContain("Recommended next steps");
    expect(report).toContain("From a clinical standpoint");

    const masking = context.themes.find((t) => t.id === "masking");
    if (masking) {
      expect(report).toContain(masking.label);
      expect(report).toContain("Supporting indicators");
    }
  });
});
