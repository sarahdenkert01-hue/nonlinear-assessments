import { NextResponse } from "next/server";
import type { ClinicianOverrides } from "@/features/assessments";
import { logSessionEvent } from "@/lib/audit";
import { requireClinicianId } from "@/lib/auth";
import { jsonError, jsonNotFound } from "@/lib/api";
import {
  extendSessionToken,
  getSessionForClinician,
  revokeSessionToken,
  updateSessionReview,
} from "@/lib/episodes";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const clinicianId = await requireClinicianId();
    const { id } = await context.params;
    const session = await getSessionForClinician(id, clinicianId);
    if (!session) return jsonNotFound("Episode");
    return NextResponse.json({ session });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return jsonError("Unauthorized", 401);
    }
    return jsonError("Failed to load episode", 500);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const clinicianId = await requireClinicianId();
    const { id } = await context.params;
    const body = await request.json();

    if (body.action === "revoke_token") {
      const session = await revokeSessionToken(id, clinicianId);
      if (!session) return jsonNotFound("Episode");
      return NextResponse.json({ session });
    }

    if (body.action === "extend_token") {
      const days =
        typeof body.days === "number" && body.days > 0 ? body.days : undefined;
      const session = await extendSessionToken(id, clinicianId, days);
      if (!session) return jsonNotFound("Episode");
      return NextResponse.json({ session });
    }

    const existing = await getSessionForClinician(id, clinicianId);
    if (!existing) return jsonNotFound("Episode");

    const session = await updateSessionReview(id, clinicianId, {
      overrides: body.overrides as ClinicianOverrides | undefined,
      clinicianNotes:
        typeof body.clinicianNotes === "string"
          ? body.clinicianNotes
          : undefined,
      status: body.status === "REVIEWED" ? "REVIEWED" : undefined,
      reportDraft:
        typeof body.reportDraft === "string" ? body.reportDraft : undefined,
      reportFinal:
        typeof body.reportFinal === "string" ? body.reportFinal : undefined,
      reportFinalized: body.reportFinalized === true,
    });

    if (!session) {
      return jsonError("Episode is not available for review", 409);
    }

    if (body.overrides !== undefined) {
      await logSessionEvent(id, "review.overrides_updated", {
        actorType: "clinician",
        actorId: clinicianId,
      });
    }
    if (body.clinicianNotes !== undefined) {
      await logSessionEvent(id, "review.notes_updated", {
        actorType: "clinician",
        actorId: clinicianId,
      });
    }
    if (body.reportDraft !== undefined) {
      await logSessionEvent(id, "review.report_updated", {
        actorType: "clinician",
        actorId: clinicianId,
      });
    }
    if (body.reportFinalized === true) {
      await logSessionEvent(id, "review.report_finalized", {
        actorType: "clinician",
        actorId: clinicianId,
      });
    }
    if (body.status === "REVIEWED") {
      await logSessionEvent(id, "review.marked_reviewed", {
        actorType: "clinician",
        actorId: clinicianId,
      });
    }

    return NextResponse.json({ session });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return jsonError("Unauthorized", 401);
    }
    return jsonError("Failed to update episode", 500);
  }
}
