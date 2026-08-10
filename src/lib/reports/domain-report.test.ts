import { describe, expect, it } from "vitest";
import { isReportEligibleStatus } from "@/lib/findings/plan";
import { assembleClinicalReport } from "./assemble";
import { buildReportContext } from "./build-context";
import {
  formatDomainReportSection,
  selectDomainReportSections,
} from "./domain-sections";
import { generateClinicalReport } from "./generate";
import { parseGenerativeReportParts } from "./parse-generative";
import { generateTemplateReport } from "./template";
import {
  ensureThemeCoverage,
  extractMissingThemeIds,
} from "./theme-coverage";
import { themeNarrative } from "./narrative";
import type { ThemeReportContext } from "./build-context";

const THEME_MASKING: ThemeReportContext = {
  id: "masking",
  label: "Masking",
  category: "Autism",
  source: "algorithm",
  hits: 3,
  total: 5,
  endorsedItems: [{ id: "q01", text: "I hide my true self", answer: "Often" }],
};

const THEME_EXEC: ThemeReportContext = {
  id: "executive-dysfunction",
  label: "Executive Dysfunction",
  category: "ADHD",
  source: "clinician-include",
  hits: 1,
  total: 4,
  endorsedItems: [{ id: "q10", text: "Hard to start tasks", answer: "Sometimes" }],
};

describe("domain-first report assembly", () => {
  it("includes every non-empty DomainReview.summaryDraft verbatim and in registry order", () => {
    const sections = selectDomainReportSections([
      // Intentionally out of registry order
      {
        domainId: "trauma-overlap",
        summaryDraft: "  Trauma narrative from clinician.  ",
      },
      {
        domainId: "executive-function",
        summaryDraft: "Executive function narrative — exact wording.",
      },
      { domainId: "emotional-regulation", summaryDraft: "   " },
      { domainId: "developmental-history", summaryDraft: null },
      {
        domainId: "sensory-processing",
        summaryDraft: "Sensory processing note.",
      },
    ]);

    expect(sections.map((s) => s.domainId)).toEqual([
      "executive-function",
      "sensory-processing",
      "trauma-overlap",
    ]);
    expect(sections[0]?.summaryDraft).toBe(
      "Executive function narrative — exact wording.",
    );

    const report = generateTemplateReport(
      buildReportContext({
        clientName: "Holly",
        answers: {},
        overrides: {},
        resolvedThemes: [],
        findingThemes: [THEME_MASKING, THEME_EXEC],
        domainSections: sections,
      }),
    );

    expect(report).toContain("## Clinical domains");
    expect(report).not.toContain("## Theme formulations");
    expect(report).toContain("### Executive Function");
    expect(report).toContain("Executive function narrative — exact wording.");
    expect(report).toContain("### Sensory Processing");
    expect(report).toContain("Sensory processing note.");
    expect(report).toContain("### Trauma & Neurodivergence Overlap");
    expect(report).toContain("Trauma narrative from clinician.");
    expect(report).not.toContain("### Emotional Regulation");
    expect(report).not.toContain("### Developmental History");

    const execIdx = report.indexOf("### Executive Function");
    const sensoryIdx = report.indexOf("### Sensory Processing");
    const traumaIdx = report.indexOf("### Trauma & Neurodivergence Overlap");
    expect(execIdx).toBeGreaterThan(-1);
    expect(sensoryIdx).toBeGreaterThan(execIdx);
    expect(traumaIdx).toBeGreaterThan(sensoryIdx);
  });

  it("does not drop a domain when Gemini omits related themes", () => {
    const domains = selectDomainReportSections([
      {
        domainId: "executive-function",
        summaryDraft: "Keep this domain even if themes are missing.",
      },
    ]);

    const report = assembleClinicalReport(
      buildReportContext({
        clientName: "Client",
        answers: {},
        overrides: {},
        resolvedThemes: [],
        // Gemini-style omission: no themes returned / empty supporting set
        findingThemes: [],
        domainSections: domains,
      }),
      {
        generative: {
          summary: "LLM summary only.",
          nextSteps: "1. Follow up",
          // Even if LLM tried to invent theme content, domains win
          themeFormulations: "### Masking\nShould not appear when domains exist.",
        },
        sourceNote: " via gemini (domains/themes assembled outside the model)",
      },
    );

    expect(report).toContain("Keep this domain even if themes are missing.");
    expect(report).toContain("### Executive Function");
    expect(report).not.toContain("### Masking");
    expect(report).toContain("LLM summary only.");
  });

  it("preserves summaryDraft text character-for-character after trim", () => {
    const text =
      "Line one with **bold** and a list:\n\n- item a\n- item b\n\nFinal sentence.";
    const section = selectDomainReportSections([
      { domainId: "masking-adaptation", summaryDraft: `\n${text}\n` },
    ])[0]!;
    expect(formatDomainReportSection(section)).toBe(
      `### Masking & Social Adaptation\n\n${text}`,
    );
  });

  it("treats only ACCEPTED/EDITED findings as report-eligible", () => {
    expect(isReportEligibleStatus("PROPOSED")).toBe(false);
    expect(isReportEligibleStatus("EXCLUDED")).toBe(false);
    expect(isReportEligibleStatus("ACCEPTED")).toBe(true);
    expect(isReportEligibleStatus("EDITED")).toBe(true);
  });

  it("uses ACCEPTED clinician and algorithm findings equally as supporting context", () => {
    const context = buildReportContext({
      clientName: "Client",
      answers: {},
      overrides: {},
      resolvedThemes: [],
      findingThemes: [THEME_MASKING, THEME_EXEC],
      domainSections: selectDomainReportSections([
        { domainId: "masking-adaptation", summaryDraft: "Domain body." },
      ]),
    });

    expect(context.themes).toHaveLength(2);
    expect(context.themes.map((t) => t.source).sort()).toEqual([
      "algorithm",
      "clinician-include",
    ]);
    const report = generateTemplateReport(context);
    expect(report).toContain("Domain body.");
    // Domain narrative takes precedence — theme subsections not rendered
    expect(report).not.toContain("## Theme formulations");
  });
});

describe("theme coverage fallback", () => {
  it("restores themes Gemini omitted from theme formulations", () => {
    const themes = [THEME_MASKING, THEME_EXEC];
    const partial = `### Masking

LLM wrote only masking.
`;
    expect(extractMissingThemeIds(partial, themes)).toEqual([
      "executive-dysfunction",
    ]);

    const restored = ensureThemeCoverage(partial, themes, themeNarrative);
    expect(restored).toContain("### Masking");
    expect(restored).toContain("LLM wrote only masking");
    expect(restored).toContain("### Executive Dysfunction");
    expect(restored).toContain("Supporting indicators: q10");
  });

  it("assembles legacy theme reports with deterministic coverage", () => {
    const report = assembleClinicalReport(
      buildReportContext({
        clientName: "Client",
        answers: {},
        overrides: {},
        resolvedThemes: [],
        findingThemes: [THEME_MASKING, THEME_EXEC],
        domainSections: [],
      }),
      {
        generative: {
          summary: "Summary",
          nextSteps: "Next",
          themeFormulations: "### Masking\n\nOnly one theme from the model.",
        },
      },
    );

    expect(report).toContain("## Theme formulations");
    expect(report).toContain("### Masking");
    expect(report).toContain("### Executive Dysfunction");
  });
});

describe("generative parse + persistence boundary", () => {
  it("parses marked generative sections without adopting domain/theme inventiveness", () => {
    const parsed = parseGenerativeReportParts(`
<<<CLINICAL_SUMMARY>>>
Overall picture.
<<<END_CLINICAL_SUMMARY>>>
<<<NEXT_STEPS>>>
1. Interview
<<<END_NEXT_STEPS>>>
`);
    expect(parsed.summary).toBe("Overall picture.");
    expect(parsed.nextSteps).toBe("1. Interview");
  });

  it("does not persist report drafts — generateClinicalReport is side-effect free", async () => {
    const prior = "EXISTING_DRAFT_MUST_REMAIN_UNTOUCHED";
    const existingDraftRef = { value: prior };
    const previous = process.env.REPORT_USE_LLM;
    process.env.REPORT_USE_LLM = "false";

    try {
      const result = await generateClinicalReport({
        clientName: "Client",
        answers: { q01: "Often" },
        overrides: {},
        resolvedThemes: [],
        findingThemes: [THEME_MASKING],
        domainSections: selectDomainReportSections([
          {
            domainId: "masking-adaptation",
            summaryDraft: "Fresh domain text for a new generation only.",
          },
        ]),
        // existingDraft is only an LLM hint when narrativeOnly; never written back here
        existingDraft: existingDraftRef.value,
      });

      expect(existingDraftRef.value).toBe(prior);
      expect(result.draft).toContain("Fresh domain text for a new generation only.");
      expect(result.draft).not.toContain(prior);
      expect(result.source).toBe("template");
    } finally {
      if (previous === undefined) delete process.env.REPORT_USE_LLM;
      else process.env.REPORT_USE_LLM = previous;
    }
  });
});
