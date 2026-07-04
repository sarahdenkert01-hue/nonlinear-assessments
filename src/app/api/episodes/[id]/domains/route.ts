import { NextResponse } from "next/server";
import { requireClinicianId } from "@/lib/auth";
import { jsonError, jsonNotFound } from "@/lib/api";
import { getSessionForClinician } from "@/lib/episodes";
import {
  countConfirmedFindings,
  listDomainSummariesForEpisode,
} from "@/lib/domains";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const clinicianId = await requireClinicianId();
    const { id } = await context.params;
    const session = await getSessionForClinician(id, clinicianId);
    if (!session) return jsonNotFound("Episode");

    const domains = await listDomainSummariesForEpisode(id);
    const confirmedFindingCount = await countConfirmedFindings(id);

    return NextResponse.json({ domains, confirmedFindingCount });
  } catch (err) {
    return handleError(err, "GET /api/episodes/:id/domains");
  }
}

function handleError(err: unknown, label: string) {
  if (process.env.NODE_ENV === "development") {
    console.error(`[${label}]`, err);
  }
  if (err instanceof Error && err.message === "Unauthorized") {
    return jsonError("Unauthorized", 401);
  }
  const message = err instanceof Error ? err.message : "Request failed";
  return jsonError(message, 500);
}
