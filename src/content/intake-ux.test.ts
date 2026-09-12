import { describe, expect, it } from "vitest";
import {
  estimatedMinutesForQuestionCount,
  estimatedMinutesRemaining,
  INTAKE_TOTAL_MINUTES,
} from "./intake-chapters";
import { getMicroValidation } from "./intake-validations";
import { buildSections } from "@/features/assessments/lib/scoring";

describe("estimatedMinutesRemaining (question-based)", () => {
  it("scales with remaining questions, not chapter count", () => {
    const total = 62;
    expect(estimatedMinutesRemaining(total, total)).toBe(INTAKE_TOTAL_MINUTES);
    expect(estimatedMinutesRemaining(31, total)).toBe(
      Math.round((31 / 62) * INTAKE_TOTAL_MINUTES),
    );
    expect(estimatedMinutesRemaining(0, total)).toBe(1);
  });

  it("does not inflate when the same questions are split into more chapters", () => {
    // Same remaining question burden → same estimate regardless of how many
    // chapters those questions would have been grouped into.
    const remaining = 40;
    const total = 62;
    const estimate = estimatedMinutesRemaining(remaining, total);
    expect(estimate).toBe(Math.round((40 / 62) * INTAKE_TOTAL_MINUTES));
    // Old chapter-based formula would have been remainingChapters * 3.
    // With 11 chapters mid-flow that could exceed this question-based value.
    expect(estimate).toBeLessThan(11 * 3);
  });

  it("estimates chapter intros from question count in the section", () => {
    expect(estimatedMinutesForQuestionCount(3, 62)).toBe(
      Math.max(1, Math.round((3 / 62) * INTAKE_TOTAL_MINUTES)),
    );
    expect(estimatedMinutesForQuestionCount(8, 62)).toBe(
      Math.max(1, Math.round((8 / 62) * INTAKE_TOTAL_MINUTES)),
    );
  });
});

describe("getMicroValidation (milestone placement)", () => {
  const sections = buildSections();
  const total = sections.reduce((n, s) => n + s.questions.length, 0);

  function findFirstMessage(message: string): { sectionIndex: number; questionIndex: number; global: number } | null {
    let global = 0;
    for (let si = 0; si < sections.length; si++) {
      const qs = sections[si]!.questions;
      for (let qi = 0; qi < qs.length; qi++) {
        if (getMicroValidation(si, qi, sections) === message) {
          return { sectionIndex: si, questionIndex: qi, global };
        }
        global++;
      }
    }
    return null;
  }

  it("shows the start message only on the first question", () => {
    expect(getMicroValidation(0, 0, sections)).toBe(
      "Take your time. There's no perfect answer.",
    );
    expect(getMicroValidation(0, 1, sections)).not.toBe(
      "Take your time. There's no perfect answer.",
    );
  });

  it("shows the early-section message on the first question of chapter 2", () => {
    expect(getMicroValidation(1, 0, sections)).toBe(
      "Not every question will fit your experience — that's expected.",
    );
  });

  it("places progress milestones sparsely and only once each", () => {
    const messages = [
      "'Not sure' is always okay.",
      "It's okay if some questions are difficult.",
      "Your first instinct is often the most helpful.",
      "You're doing fine. Answer based on the past several months.",
    ];

    for (const message of messages) {
      const hit = findFirstMessage(message);
      expect(hit, message).not.toBeNull();
      // Ensure uniqueness
      let count = 0;
      let global = 0;
      for (let si = 0; si < sections.length; si++) {
        for (let qi = 0; qi < sections[si]!.questions.length; qi++) {
          if (getMicroValidation(si, qi, sections) === message) count++;
          global++;
        }
      }
      expect(global).toBe(total);
      expect(count).toBe(1);
    }
  });

  it("does not attach messages to the majority of questions", () => {
    let withMessage = 0;
    for (let si = 0; si < sections.length; si++) {
      for (let qi = 0; qi < sections[si]!.questions.length; qi++) {
        if (getMicroValidation(si, qi, sections)) withMessage++;
      }
    }
    expect(withMessage).toBeLessThanOrEqual(6);
    expect(withMessage).toBeGreaterThanOrEqual(5);
  });
});
