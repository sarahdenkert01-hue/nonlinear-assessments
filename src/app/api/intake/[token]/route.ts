import { NextResponse } from "next/server";
import type { AssessmentAnswers } from "@/features/assessments";
import { logSessionEvent } from "@/lib/audit";
import { jsonError, jsonNotFound } from "@/lib/api";
import { getIntakeAccessDenial } from "@/lib/intake-access";
import {
  getSessionByToken,
  updateSessionAnswers,
} from "@/lib/episodes";

type RouteContext = { params: Promise<{ token: string }> };

/**
 * Legacy screener autosave.
 * Client journey UIs now PATCH `/api/intake/[token]/modules/[moduleKey]` instead.
 * GET was removed: nothing in the app called it; episode state is loaded via
 * server-rendered `/intake/[token]` and `/api/intake/[token]/modules`.
 */
export async function PATCH(request: Request, context: RouteContext) {
  const { token } = await context.params;

  try {
    const existing = await getSessionByToken(token);
    if (!existing) return jsonNotFound("Intake session");
    const denial = getIntakeAccessDenial(existing);
    if (denial) {
      return jsonError(
        denial === "revoked"
          ? "Link revoked"
          : denial === "expired"
            ? "Link expired"
            : "Consent required",
        denial === "consent_required" ? 403 : 410,
      );
    }
    if (!existing.consentAcceptedAt) {
      return jsonError("Consent required", 403);
    }

    const body = await request.json();
    if (!body.answers || typeof body.answers !== "object") {
      return jsonError("answers object is required", 400);
    }

    const session = await updateSessionAnswers(
      token,
      body.answers as AssessmentAnswers,
    );

    if (!session) {
      return jsonError("Session not found or no longer editable", 409);
    }

    await logSessionEvent(session.id, "intake.answers_saved", {
      actorType: "client",
    });

    return NextResponse.json({ session });
  } catch {
    return jsonError("Failed to save answers", 500);
  }
}
