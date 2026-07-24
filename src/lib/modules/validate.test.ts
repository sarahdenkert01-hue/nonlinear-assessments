import { describe, expect, it } from "vitest";
import { MODULE_KEYS } from "./registry";
import { validateModulePayload } from "./validate";

describe("validateModulePayload", () => {
  it("rejects unknown module keys", () => {
    expect(validateModulePayload("not-a-module", { a: 1 }).ok).toBe(false);
  });

  it("rejects non-objects", () => {
    expect(validateModulePayload(MODULE_KEYS.GUIDED_REFLECTION, []).ok).toBe(false);
  });

  it("accepts known guided reflection sections and strips unknowns via parse", () => {
    const result = validateModulePayload(MODULE_KEYS.GUIDED_REFLECTION, {
      patterns: "hello",
      hopes: "clarity",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ patterns: "hello", hopes: "clarity" });
    }
  });

  it("rejects unknown guided reflection keys", () => {
    const result = validateModulePayload(MODULE_KEYS.GUIDED_REFLECTION, {
      patterns: "ok",
      secret: "nope",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects oversized reflection text", () => {
    const result = validateModulePayload(MODULE_KEYS.GUIDED_REFLECTION, {
      patterns: "x".repeat(10_001),
    });
    expect(result.ok).toBe(false);
  });

  it("accepts a valid life map payload", () => {
    const result = validateModulePayload(MODULE_KEYS.LIFE_MAP, {
      entries: [
        {
          id: "e1",
          lifeStage: "Adolescence",
          title: "School",
          description: "Moved",
          supportive: "",
          difficult: "",
          adapted: "",
          affectsNow: "",
          tags: ["School"],
          sortOrder: 0,
        },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it("rejects unknown life map tags", () => {
    const result = validateModulePayload(MODULE_KEYS.LIFE_MAP, {
      entries: [
        {
          id: "e1",
          lifeStage: "Adolescence",
          title: "",
          description: "",
          supportive: "",
          difficult: "",
          adapted: "",
          affectsNow: "",
          tags: ["NotARealTag"],
          sortOrder: 0,
        },
      ],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects too many life map entries", () => {
    const entries = Array.from({ length: 41 }, (_, i) => ({
      id: `e${i}`,
      lifeStage: "Adulthood",
      title: "",
      description: "",
      supportive: "",
      difficult: "",
      adapted: "",
      affectsNow: "",
      tags: [],
      sortOrder: i,
    }));
    expect(validateModulePayload(MODULE_KEYS.LIFE_MAP, { entries }).ok).toBe(false);
  });
});
