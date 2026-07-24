import { NextResponse } from "next/server";
import { logSessionEvent } from "@/lib/audit";
import { jsonError, jsonNotFound } from "@/lib/api";
import { getIntakeAccessDenial } from "@/lib/intake-access";
import {
  getModuleByTokenAndKey,
  getSessionByToken,
  updateModuleData,
} from "@/lib/episodes";
import { assertKnownModuleKey, validateModulePayload } from "@/lib/modules";

type RouteContext = { params: Promise<{ token: string; moduleKey: string }> };

function denialResponse(denial: string) {
  return jsonError(
    denial === "revoked"
      ? "Link revoked"
      : denial === "expired"
        ? "Link expired"
        : "Consent required",
    denial === "consent_required" ? 403 : 410,
  );
}

function requireConsent(session: { consentAcceptedAt: string | null }) {
  if (!session.consentAcceptedAt) {
    return jsonError("Consent required", 403);
  }
  return null;
}

export async function GET(_request: Request, context: RouteContext) {
  const { token, moduleKey } = await context.params;
  if (!assertKnownModuleKey(moduleKey)) return jsonError("Unknown module", 400);

  const session = await getSessionByToken(token);
  if (!session) return jsonNotFound("Intake session");
  const denial = getIntakeAccessDenial(session);
  if (denial) return denialResponse(denial);
  const consentError = requireConsent(session);
  if (consentError) return consentError;

  const moduleRecord = await getModuleByTokenAndKey(token, moduleKey);
  if (!moduleRecord) return jsonNotFound("Module");
  return NextResponse.json({ module: moduleRecord });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { token, moduleKey } = await context.params;
  if (!assertKnownModuleKey(moduleKey)) return jsonError("Unknown module", 400);

  try {
    const session = await getSessionByToken(token);
    if (!session) return jsonNotFound("Intake session");
    const denial = getIntakeAccessDenial(session);
    if (denial) return denialResponse(denial);
    const consentError = requireConsent(session);
    if (consentError) return consentError;

    const body = await request.json();
    if (!body.data || typeof body.data !== "object" || Array.isArray(body.data)) {
      return jsonError("data object is required", 400);
    }

    const validation = validateModulePayload(moduleKey, body.data);
    if (!validation.ok) return jsonError(validation.error, 400);

    const moduleRecord = await updateModuleData(token, moduleKey, validation.data);
    if (!moduleRecord) {
      return jsonError("Module not found or no longer editable", 409);
    }

    await logSessionEvent(session.id, "module.answers_saved", {
      actorType: "client",
      metadata: { moduleKey },
    });

    return NextResponse.json({ module: moduleRecord });
  } catch {
    return jsonError("Failed to save module", 500);
  }
}
