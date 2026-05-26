import { NextResponse } from "next/server";
import { requireClinicianId } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { createClient, listClientsForClinician } from "@/lib/sessions";

export async function GET() {
  try {
    const clinicianId = await requireClinicianId();
    const clients = await listClientsForClinician(clinicianId);
    return NextResponse.json({ clients });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return jsonError("Unauthorized", 401);
    }
    return jsonError("Failed to list clients", 500);
  }
}

export async function POST(request: Request) {
  try {
    const clinicianId = await requireClinicianId();
    const body = await request.json();
    const displayName =
      typeof body.displayName === "string" ? body.displayName.trim() : "";
    if (!displayName) return jsonError("displayName is required", 400);

    const client = await createClient({
      clinicianId,
      displayName,
      email: typeof body.email === "string" ? body.email : undefined,
    });
    return NextResponse.json({ client });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return jsonError("Unauthorized", 401);
    }
    return jsonError("Failed to create client", 500);
  }
}
