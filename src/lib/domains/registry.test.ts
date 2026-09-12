import { describe, expect, it } from "vitest";
import { THEMES } from "@/features/assessments/data/themes";
import {
  CLINICAL_DOMAINS,
  getAllDomains,
  getDomainById,
  getDomainsForTheme,
  validateThemeDomainCoverage,
} from "./registry";

describe("domain registry", () => {
  it("defines 14 stable clinical domains", () => {
    expect(CLINICAL_DOMAINS).toHaveLength(14);
  });

  it("maps every screener theme to at least one domain", () => {
    expect(validateThemeDomainCoverage()).toEqual([]);
    for (const theme of THEMES) {
      expect(getDomainsForTheme(theme.id).length).toBeGreaterThan(0);
    }
  });

  it("maps executive themes to executive-function", () => {
    expect(getDomainsForTheme("executive-dysfunction")).toContain("executive-function");
    expect(getDomainsForTheme("task-paralysis")).toContain("executive-function");
    expect(getDomainsForTheme("executive-functioning-activation")).toEqual([
      "executive-function",
      "attention-regulation",
    ]);
    expect(getDomainsForTheme("task-initiation-state-dependence")[0]).toBe(
      "executive-function",
    );
    expect(getDomainsForTheme("switching-engagement-inertia")).toEqual([
      "executive-function",
      "attention-regulation",
    ]);
  });

  it("maps functional-inconsistency primarily to executive-function with secondaries", () => {
    expect(getDomainsForTheme("functional-inconsistency")).toEqual([
      "executive-function",
      "attention-regulation",
      "functional-impact",
    ]);
  });

  it("adds burnout/sensory secondaries for task-initiation-state-dependence", () => {
    const domains = getDomainsForTheme("task-initiation-state-dependence");
    expect(domains).toContain("burnout-collapse");
    expect(domains).toContain("sensory-processing");
    expect(domains).toContain("attention-regulation");
  });

  it("preserves theme ids — domains are separate from finding codes", () => {
    const domain = getDomainById("masking-adaptation");
    expect(domain?.label).toBe("Masking & Social Adaptation");
    expect(getDomainsForTheme("masking")).not.toContain("masking");
  });

  it("returns all domains in stable order", () => {
    expect(getAllDomains()[0]?.id).toBe("executive-function");
  });
});
