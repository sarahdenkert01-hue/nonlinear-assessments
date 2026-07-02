import { NextResponse } from "next/server";
import { requireClinicianId } from "@/lib/auth";
import { jsonError, jsonNotFound } from "@/lib/api";
import { getClientForClinician, listSessionsForClient } from "@/lib/episodes";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const clinicianId = await requireClinicianId();
    const { id } = await context.params;
    const client = await getClientForClinician(id, clinicianId);
    if (!client) return jsonNotFound("Client");

    const sessions = await listSessionsForClient(id, clinicianId);
    return NextResponse.json({ client, sessions });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return jsonError("Unauthorized", 401);
    }
    return jsonError("Failed to load client", 500);
  }
}
