import { describe, expect, it } from "vitest";
import { QUESTIONS } from "../data/questions";
import { buildSections } from "./scoring";
import { isAssessmentQuestion, isSectionMarker } from "../types";
import { CHAPTER_CONTENT } from "@/content/intake-chapters";
import { CHAPTER_REFLECTION_PROMPTS } from "@/content/intake-reflections";

describe("questionnaire section presentation (EF regroup)", () => {
  const sections = buildSections();

  it("keeps every q01–q62 item exactly once", () => {
    const ids = QUESTIONS.filter(isAssessmentQuestion).map((q) => q.id);
    const expected = Array.from({ length: 62 }, (_, i) => `q${String(i + 1).padStart(2, "0")}`);
    expect(ids.sort()).toEqual([...expected].sort());
    expect(new Set(ids).size).toBe(62);
  });

  it("orders EF-related client sections as Thinking → Getting started → Stopping", () => {
    const titles = sections.map((s) => s.title);
    const thinking = titles.indexOf("Thinking and getting things done");
    const started = titles.indexOf("Getting started & keeping momentum");
    const stopping = titles.indexOf("Stopping, switching & getting unstuck");
    const body = titles.indexOf("Your body and nervous system");

    expect(thinking).toBeGreaterThanOrEqual(0);
    expect(started).toBe(thinking + 1);
    expect(stopping).toBe(started + 1);
    expect(body).toBe(stopping + 1);
  });

  it("places the preferred questions in each EF section in the intended display order", () => {
    const byTitle = Object.fromEntries(sections.map((s) => [s.title, s.questions.map((q) => q.id)]));

    expect(byTitle["Thinking and getting things done"]).toEqual([
      "q08",
      "q54",
      "q55",
      "q56",
      "q57",
      "q09",
      "q12",
      "q61",
    ]);

    expect(byTitle["Getting started & keeping momentum"]).toEqual([
      "q07",
      "q10",
      "q52",
      "q58",
      "q59",
      "q60",
      "q62",
    ]);

    expect(byTitle["Stopping, switching & getting unstuck"]).toEqual([
      "q50",
      "q51",
      "q53",
    ]);
  });

  it("relocates overload/shame/perfection items to Burnout and Identity", () => {
    const byTitle = Object.fromEntries(sections.map((s) => [s.title, s.questions.map((q) => q.id)]));

    expect(byTitle["Burnout and energy"][0]).toBe("q11");
    expect(byTitle["Burnout and energy"]).toContain("q11");
    expect(byTitle["Thinking and getting things done"]).not.toContain("q11");

    expect(byTitle["Identity and sense of self"]).toEqual(
      expect.arrayContaining(["q13", "q14"]),
    );
    expect(byTitle["Identity and sense of self"].slice(-2)).toEqual(["q13", "q14"]);
    expect(byTitle["Thinking and getting things done"]).not.toContain("q13");
    expect(byTitle["Thinking and getting things done"]).not.toContain("q14");
  });

  it("preserves theme arrays on moved items (spot-check)", () => {
    const byId = Object.fromEntries(
      QUESTIONS.filter(isAssessmentQuestion).map((q) => [q.id, q]),
    );
    expect(byId.q07!.themes).toEqual(["task-initiation-state-dependence"]);
    expect(byId.q11!.themes).toEqual([
      "cognitive-overload",
      "neurodivergent-burnout",
      "masking-fatigue",
    ]);
    expect(byId.q13!.themes).toEqual(["perfectionistic-compensation", "chronic-shame"]);
    expect(byId.q14!.themes).toEqual([
      "perfectionistic-compensation",
      "chronic-overcompensation",
    ]);
    expect(byId.q50!.themes).toEqual(["switching-engagement-inertia"]);
    expect(byId.q54!.themes).toEqual(["executive-functioning-activation"]);
    expect(byId.q60!.themes).toEqual([
      "task-initiation-state-dependence",
      "functional-inconsistency",
    ]);
    expect(byId.q62!.themes).toEqual([]);
  });

  it("keeps chapter copy and reflection prompts aligned with section count", () => {
    expect(sections).toHaveLength(11);
    expect(CHAPTER_CONTENT).toHaveLength(11);
    expect(CHAPTER_REFLECTION_PROMPTS).toHaveLength(11);
  });

  it("does not duplicate section markers or lose markers between questions", () => {
    const markers = QUESTIONS.filter(isSectionMarker);
    expect(markers).toHaveLength(11);
    expect(markers.map((m) => m.section)).toEqual(sections.map((s) => s.title));
  });

  it("reports balanced section sizes (flag outliers)", () => {
    const sizes = sections.map((s) => ({ title: s.title, n: s.questions.length }));
    const thinking = sizes.find((s) => s.title === "Thinking and getting things done");
    expect(thinking?.n).toBe(8);

    // Stopping is intentionally short; own-words may be few open items.
    const stopping = sizes.find((s) => s.title === "Stopping, switching & getting unstuck");
    expect(stopping?.n).toBe(3);
  });
});
