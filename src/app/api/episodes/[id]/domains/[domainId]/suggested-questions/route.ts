import { NextResponse } from "next/server";
import { requireClinicianId } from "@/lib/auth";
import { jsonError, jsonNotFound } from "@/lib/api";
import { getSessionForClinician } from "@/lib/episodes";
import { generateAndSaveSuggestedQuestions } from "@/lib/domains";

type RouteContext = { params: Promise<{ id: string; domainId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const clinicianId = await requireClinicianId();
    const { id, domainId } = await context.params;
    const session = await getSessionForClinician(id, clinicianId);
    if (!session) return jsonNotFound("Episode");

    let replaceAll = false;
    try {
      const body = (await request.json()) as { replaceAll?: boolean };
      replaceAll = body.replaceAll === true;
    } catch {
      // empty body is fine — append by default
    }

    const domain = await generateAndSaveSuggestedQuestions(id, domainId, clinicianId, {
      replaceAll,
    });
    if (!domain) return jsonNotFound("Domain");

    return NextResponse.json({ domain });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[POST /api/episodes/:id/domains/:domainId/suggested-questions]", err);
    }
    if (err instanceof Error && err.message === "Unauthorized") {
      return jsonError("Unauthorized", 401);
    }
    const message = err instanceof Error ? err.message : "Request failed";
    return jsonError(message, 500);
  }
}
