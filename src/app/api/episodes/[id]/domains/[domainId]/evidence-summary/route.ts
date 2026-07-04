import { NextResponse } from "next/server";
import { requireClinicianId } from "@/lib/auth";
import { jsonError, jsonNotFound } from "@/lib/api";
import { getSessionForClinician } from "@/lib/episodes";
import { generateAndSaveEvidenceSummary } from "@/lib/domains";

type RouteContext = { params: Promise<{ id: string; domainId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const clinicianId = await requireClinicianId();
    const { id, domainId } = await context.params;
    const session = await getSessionForClinician(id, clinicianId);
    if (!session) return jsonNotFound("Episode");

    const domain = await generateAndSaveEvidenceSummary(id, domainId, clinicianId);
    if (!domain) return jsonNotFound("Domain");

    return NextResponse.json({ domain });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[POST /api/episodes/:id/domains/:domainId/evidence-summary]", err);
    }
    if (err instanceof Error && err.message === "Unauthorized") {
      return jsonError("Unauthorized", 401);
    }
    const message = err instanceof Error ? err.message : "Request failed";
    return jsonError(message, 500);
  }
}
