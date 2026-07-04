import { describe, expect, it } from "vitest";
import {
  createQuestionPrompt,
  mergeQuestionPrompts,
  parseQuestionsFromText,
  resolveClinicalQuestionPrompts,
} from "./clinical-questions";

describe("clinical-questions", () => {
  it("parses bullet questions from legacy text", () => {
    const text = "Suggested clinical questions\n\n• When did this start?\n• How does it affect work?";
    expect(parseQuestionsFromText(text)).toEqual([
      "When did this start?",
      "How does it affect work?",
    ]);
  });

  it("appends with dedupe and preserves existing prompts", () => {
    const existing = [createQuestionPrompt("When did this start?")];
    const merged = mergeQuestionPrompts(existing, ["When did this start?", "What helps?"], false);
    expect(merged).toHaveLength(2);
    expect(merged[1]!.text).toBe("What helps?");
  });

  it("resolves from JSON first then legacy text", () => {
    const json = [{ id: "1", text: "From JSON", askedAt: null, note: null }];
    expect(resolveClinicalQuestionPrompts(json, "• Legacy")).toEqual([
      { id: "1", text: "From JSON", askedAt: null, note: null },
    ]);
  });
});
