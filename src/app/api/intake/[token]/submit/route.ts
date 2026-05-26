import { NextResponse } from "next/server";
import type { AssessmentAnswers } from "@/features/assessments";
import { jsonError, jsonNotFound } from "@/lib/api";
import { getIntakeAccessDenial } from "@/lib/intake-access";
import { notifyClinicianOnSubmission } from "@/lib/notifications";
import { getSessionByToken, submitSession } from "@/lib/sessions";

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: Request, context: RouteContext) {
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

    const body = await request.json().catch(() => ({}));
    const answers =
      body.answers && typeof body.answers === "object"
        ? (body.answers as AssessmentAnswers)
        : undefined;

    const session = await submitSession(token, answers);
    if (!session) {
      return jsonError("Session already submitted", 409);
    }

    await notifyClinicianOnSubmission(session);

    return NextResponse.json({ session });
  } catch {
    return jsonError("Failed to submit session", 500);
  }
}
