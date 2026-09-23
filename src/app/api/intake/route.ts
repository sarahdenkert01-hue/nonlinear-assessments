import { NextResponse } from "next/server";
import { requireClinicianId } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { createSession } from "@/lib/episodes";
import { MODULE_KEYS, isAssignmentPackageId } from "@/lib/modules";

export async function POST(request: Request) {
  try {
    const clinicianId = await requireClinicianId();
    const body = await request.json().catch(() => ({}));
    const clientName =
      typeof body.clientName === "string" ? body.clientName : undefined;
    const clientId =
      typeof body.clientId === "string" ? body.clientId : undefined;
    const packageId = isAssignmentPackageId(body.packageId)
      ? body.packageId
      : "nonlinear";

    const session = await createSession({
      clientName,
      clientId,
      clinicianId,
      packageId,
    });
    const origin = new URL(request.url).origin;

    const reviewUrl =
      packageId === "cat-q"
        ? `${origin}/cases/${session.id}/modules/${MODULE_KEYS.CAT_Q}`
        : `${origin}/cases/${session.id}/assessment`;

    return NextResponse.json({
      session,
      packageId,
      intakeUrl: `${origin}/intake/${session.token}`,
      reviewUrl,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return jsonError("Unauthorized", 401);
    }
    return jsonError("Failed to create intake session", 500);
  }
}
