import { NextResponse } from "next/server";
import { requireClinicianId } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { createSession } from "@/lib/sessions";

export async function POST(request: Request) {
  try {
    const clinicianId = await requireClinicianId();
    const body = await request.json().catch(() => ({}));
    const clientName =
      typeof body.clientName === "string" ? body.clientName : undefined;
    const clientId =
      typeof body.clientId === "string" ? body.clientId : undefined;

    const session = await createSession({ clientName, clientId, clinicianId });
    const origin = new URL(request.url).origin;

    return NextResponse.json({
      session,
      intakeUrl: `${origin}/intake/${session.token}`,
      reviewUrl: `${origin}/cases/${session.id}/assessment`,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return jsonError("Unauthorized", 401);
    }
    return jsonError("Failed to create intake session", 500);
  }
}
