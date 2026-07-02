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

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const session = await getSessionByToken(token);
  if (!session) return jsonNotFound("Intake session");
  const denial = getIntakeAccessDenial(session);
  if (denial && denial !== "consent_required") {
    return jsonError(
      denial === "revoked" ? "Link revoked" : "Link expired",
      410,
    );
  }
  return NextResponse.json({ session });
}

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
