import { describe, expect, it } from "vitest";
import { buildExplorationReportContext } from "./exploration-context";
import { MODULE_KEYS } from "./registry";

describe("buildExplorationReportContext", () => {
  it("returns empty context when nothing is submitted", () => {
    expect(
      buildExplorationReportContext([
        {
          moduleKey: MODULE_KEYS.LIFE_MAP,
          status: "IN_PROGRESS",
          data: { entries: [{ id: "1", lifeStage: "Adolescence" }] },
        },
      ]),
    ).toEqual({});
  });

  it("includes submitted life map and reflection as client report", () => {
    const ctx = buildExplorationReportContext([
      {
        moduleKey: MODULE_KEYS.LIFE_MAP,
        status: "SUBMITTED",
        data: {
          entries: [
            {
              id: "e1",
              lifeStage: "Adolescence",
              title: "High school",
              description: "Moved schools",
              supportive: "",
              difficult: "",
              adapted: "",
              affectsNow: "",
              tags: ["School"],
              sortOrder: 0,
            },
          ],
        },
      },
      {
        moduleKey: MODULE_KEYS.GUIDED_REFLECTION,
        status: "SUBMITTED",
        data: { patterns: "I notice masking", hopes: "Clarity" },
      },
    ]);

    expect(ctx.developmentalLifeMap?.entries).toHaveLength(1);
    expect(ctx.developmentalLifeMap?.entries[0].title).toBe("High school");
    expect(ctx.guidedReflection?.sections).toEqual({
      patterns: "I notice masking",
      hopes: "Clarity",
    });
  });
});
