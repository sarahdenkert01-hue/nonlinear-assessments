import { describe, expect, it } from "vitest";
import { themeNarrative } from "./narrative";
import type { ThemeReportContext } from "./build-context";

function stubTheme(
  id: string,
  label: string,
  category: "Autism" | "ADHD" | "Both" = "Both",
): ThemeReportContext {
  return {
    id,
    label,
    category,
    source: "algorithm",
    hits: 2,
    total: 3,
    endorsedItems: [
      { id: "q50", text: "Example item", answer: "Often" },
      { id: "q51", text: "Another item", answer: "Very Often" },
    ],
  };
}

describe("THEME_FRAMING for EF expansion", () => {
  it("frames new descriptive themes without ADHD/Autism diagnostic conclusions", () => {
    const activation = themeNarrative(
      stubTheme("executive-functioning-activation", "Executive Functioning & Activation"),
    );
    expect(activation).toMatch(/working memory|sequencing|prioritization|prospective memory|time/i);
    expect(activation).toMatch(/does not assign a diagnosis/i);
    expect(activation).not.toMatch(/\bADHD diagnosis\b|\bAutism diagnosis\b/i);

    const initiation = themeNarrative(
      stubTheme("task-initiation-state-dependence", "Task Initiation & State Dependence"),
    );
    expect(initiation).toMatch(/urgency|interest|external|fatigue|overwhelm|sensory/i);

    const switching = themeNarrative(
      stubTheme("switching-engagement-inertia", "Switching & Engagement Inertia"),
    );
    expect(switching).toMatch(/shifting|disengaging|interruption|transition/i);

    const inconsistency = themeNarrative(
      stubTheme("functional-inconsistency", "Functional Inconsistency"),
    );
    expect(inconsistency).toMatch(/variability|access to everyday skills|contexts or states/i);
  });
});
