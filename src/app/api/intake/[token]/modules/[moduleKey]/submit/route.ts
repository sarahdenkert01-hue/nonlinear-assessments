import { NextResponse } from "next/server";
import { jsonError, jsonNotFound } from "@/lib/api";
import { getIntakeAccessDenial } from "@/lib/intake-access";
import { MODULE_KEYS, assertKnownModuleKey, validateModulePayload } from "@/lib/modules";
import { notifyClinicianOnSubmission } from "@/lib/notifications";
import { getSessionByToken, submitModule } from "@/lib/episodes";

type RouteContext = { params: Promise<{ token: string; moduleKey: string }> };

function parseExpectedRevision(raw: unknown): number | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  return undefined;
}

export async function POST(request: Request, context: RouteContext) {
  const { token, moduleKey } = await context.params;
  if (!assertKnownModuleKey(moduleKey)) return jsonError("Unknown module", 400);

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

    const body = await request.json().catch(() => ({}));
    const raw =
      body.data && typeof body.data === "object" && !Array.isArray(body.data)
        ? body.data
        : body.answers && typeof body.answers === "object" && !Array.isArray(body.answers)
          ? body.answers
          : undefined;

    if (raw !== undefined) {
      const validation = validateModulePayload(moduleKey, raw);
      if (!validation.ok) return jsonError(validation.error, 400);
    }

    const expectedRevision = parseExpectedRevision(body.expectedRevision);
    if (body.expectedRevision !== undefined && expectedRevision === undefined) {
      return jsonError("expectedRevision must be a number", 400);
    }

    const result = await submitModule(token, moduleKey, raw, { expectedRevision });
    if (!result.ok) {
      if (result.code === "incomplete") {
        return NextResponse.json(
          {
            error: result.message,
            code: "incomplete",
            missingItemIds: result.missingItemIds,
            module: result.module,
          },
          { status: 422 },
        );
      }
      if (result.code === "conflict") {
        return NextResponse.json(
          {
            error: result.message,
            code: "conflict",
            currentRevision: result.currentRevision,
            module: result.module,
          },
          { status: 409 },
        );
      }
      if (result.code === "locked") {
        return jsonError(result.message, 409);
      }
      if (result.code === "validation") {
        return jsonError(result.message, 400);
      }
      return jsonError(result.message, 404);
    }

    if (moduleKey === MODULE_KEYS.SCREENER) {
      const session = await getSessionByToken(token);
      if (session) await notifyClinicianOnSubmission(session);
    }

    return NextResponse.json({ module: result.module });
  } catch {
    return jsonError("Failed to submit module", 500);
  }
}
