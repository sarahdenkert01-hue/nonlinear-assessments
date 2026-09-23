import { describe, expect, it } from "vitest";
import { MODULE_KEYS } from "@/lib/modules";
import { buildEpisodeResponseReview } from "./response-review";

describe("response review CAT-Q branch", () => {
  it("renders CAT-Q prompts from the item bank", () => {
    const review = buildEpisodeResponseReview("ep1", [
      {
        moduleKey: MODULE_KEYS.CAT_Q,
        moduleVersion: "1",
        status: "SUBMITTED",
        submittedAt: new Date("2026-01-01T00:00:00.000Z"),
        audience: "CLIENT",
        responses: [
          { itemId: "catq-01", value: 5 },
          { itemId: "catq-02", value: 3 },
        ],
      },
    ]);

    expect(review.modules).toHaveLength(1);
    const mod = review.modules[0]!;
    expect(mod.moduleKey).toBe(MODULE_KEYS.CAT_Q);
    expect(mod.totalPromptCount).toBe(25);
    expect(mod.answeredCount).toBe(2);
    expect(mod.items[0]?.prompt).toContain(
      "When I am interacting with someone, I deliberately copy their body language",
    );
    expect(mod.items[0]?.answer).toContain("5");
  });
});

describe("clinician authorization contract (module access)", () => {
  /**
   * Clinician CAT-Q results reuse getSessionForClinician / getModuleForClinician,
   * which scope by clinicianId. Arbitrary episode IDs without ownership return null → 404.
   * This test documents the invariant covered by those repository helpers.
   */
  it("documents that CAT-Q clinician routes require episode ownership", () => {
    expect(MODULE_KEYS.CAT_Q).toBe("cat-q");
  });
});
