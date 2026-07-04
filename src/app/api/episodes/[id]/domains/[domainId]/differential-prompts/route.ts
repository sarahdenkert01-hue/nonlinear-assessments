import { NextResponse } from "next/server";
import { requireClinicianId } from "@/lib/auth";
import { jsonError, jsonNotFound } from "@/lib/api";
import { getSessionForClinician } from "@/lib/episodes";
import { getDomainDetailForEpisode } from "@/lib/domains";
import {
  formatDifferentialPromptsDraft,
  generateDifferentialPrompts,
} from "@/lib/domains/suggest-differentials";

type RouteContext = { params: Promise<{ id: string; domainId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const clinicianId = await requireClinicianId();
    const { id, domainId } = await context.params;
    const session = await getSessionForClinician(id, clinicianId);
    if (!session) return jsonNotFound("Episode");

    const detail = await getDomainDetailForEpisode(id, domainId);
    if (!detail) return jsonNotFound("Domain");

    const result = await generateDifferentialPrompts({
      domainLabel: detail.label,
      domainDescription: detail.description,
      findings: detail.findings,
    });

    return NextResponse.json({
      prompts: result.prompts,
      draft: formatDifferentialPromptsDraft(result.prompts),
      source: result.source,
      generatedAt: result.generatedAt,
      fallbackReason: result.fallbackReason,
    });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[POST /api/episodes/:id/domains/:domainId/differential-prompts]", err);
    }
    if (err instanceof Error && err.message === "Unauthorized") {
      return jsonError("Unauthorized", 401);
    }
    const message = err instanceof Error ? err.message : "Request failed";
    return jsonError(message, 500);
  }
}
