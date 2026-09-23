import { NextResponse } from "next/server";
import { requireClinicianId } from "@/lib/auth";
import { jsonError, jsonNotFound } from "@/lib/api";
import { addModulesToEpisode } from "@/lib/episodes";
import { isKnownModuleKey } from "@/lib/modules";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Clinician action: add known client modules to an episode (e.g. CAT-Q).
 * Skips modules already assigned — no duplicates.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const clinicianId = await requireClinicianId();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const rawKeys = Array.isArray(body.moduleKeys) ? body.moduleKeys : [];
    const moduleKeys = rawKeys.filter(
      (k: unknown): k is string => typeof k === "string" && isKnownModuleKey(k),
    );

    if (moduleKeys.length === 0) {
      return jsonError("moduleKeys must include at least one known module", 400);
    }

    const result = await addModulesToEpisode(id, clinicianId, moduleKeys);
    if (!result) return jsonNotFound("Episode");

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.message,
          code: result.code,
          modules: result.modules,
        },
        { status: result.code === "nothing_to_add" ? 409 : 400 },
      );
    }

    return NextResponse.json({
      modules: result.modules,
      added: result.added,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return jsonError("Unauthorized", 401);
    }
    return jsonError("Failed to add modules", 500);
  }
}
