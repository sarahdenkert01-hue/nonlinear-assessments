import { NextResponse } from "next/server";
import { requireClinicianId } from "@/lib/auth";
import { jsonError, jsonNotFound } from "@/lib/api";
import { addExplorationModules } from "@/lib/episodes";

type RouteContext = { params: Promise<{ id: string }> };

/** Clinician action: add missing exploration modules to a legacy episode. */
export async function POST(_request: Request, context: RouteContext) {
  try {
    const clinicianId = await requireClinicianId();
    const { id } = await context.params;
    const modules = await addExplorationModules(id, clinicianId);
    if (!modules) return jsonNotFound("Episode");
    return NextResponse.json({ modules });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return jsonError("Unauthorized", 401);
    }
    return jsonError("Failed to add explorations", 500);
  }
}
