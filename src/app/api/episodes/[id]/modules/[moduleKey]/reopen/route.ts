import { NextResponse } from "next/server";
import { jsonError, jsonNotFound } from "@/lib/api";
import { requireClinicianId } from "@/lib/auth";
import { reopenClientModuleForClinician } from "@/lib/episodes";
import { assertKnownModuleKey } from "@/lib/modules";

type RouteContext = {
  params: Promise<{ id: string; moduleKey: string }>;
};

/**
 * POST /api/episodes/[id]/modules/[moduleKey]/reopen
 * Body: { clearResponses?: boolean }
 *
 * Reopens a submitted client module on the existing intake token.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const clinicianId = await requireClinicianId();
    const { id, moduleKey } = await context.params;
    if (!assertKnownModuleKey(moduleKey)) {
      return jsonError("Unknown module", 400);
    }

    const body = await request.json().catch(() => ({}));
    const clearResponses = Boolean(body?.clearResponses);

    const result = await reopenClientModuleForClinician(
      id,
      clinicianId,
      moduleKey,
      { clearResponses },
    );

    if (!result.ok) {
      if (result.code === "not_found") return jsonNotFound("Module");
      if (result.code === "not_locked") return jsonError(result.message, 409);
      return jsonError(result.message, 400);
    }

    return NextResponse.json({
      module: result.module,
      clearedResponseCount: result.clearedResponseCount,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return jsonError("Unauthorized", 401);
    }
    return jsonError("Failed to reopen module", 500);
  }
}
