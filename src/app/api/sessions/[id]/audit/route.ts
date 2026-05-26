import { NextResponse } from "next/server";
import { AUDIT_ACTION_LABELS, listSessionEvents } from "@/lib/audit";
import { requireClinicianId } from "@/lib/auth";
import { jsonError, jsonNotFound } from "@/lib/api";
import { getSessionForClinician } from "@/lib/sessions";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const clinicianId = await requireClinicianId();
    const { id } = await context.params;
    const session = await getSessionForClinician(id, clinicianId);
    if (!session) return jsonNotFound("Session");

    const events = await listSessionEvents(id);
    return NextResponse.json({
      events: events.map((e) => ({
        id: e.id,
        action: e.action,
        label: AUDIT_ACTION_LABELS[e.action] ?? e.action,
        actorType: e.actorType,
        actorId: e.actorId,
        metadata: e.metadata,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return jsonError("Unauthorized", 401);
    }
    return jsonError("Failed to load audit log", 500);
  }
}
