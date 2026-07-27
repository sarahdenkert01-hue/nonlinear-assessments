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

function parseClearItemIds(raw: unknown): string[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) return undefined;
  return raw.filter((v): v is string => typeof v === "string" && v.length > 0 && v.length <= 64);
}

function parseExpectedRevision(raw: unknown): number | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  return undefined;
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

    const clearItemIds = parseClearItemIds(body.clearItemIds);
    if (body.clearItemIds !== undefined && clearItemIds === undefined) {
      return jsonError("clearItemIds must be an array of strings", 400);
    }
    const expectedRevision = parseExpectedRevision(body.expectedRevision);
    if (body.expectedRevision !== undefined && expectedRevision === undefined) {
      return jsonError("expectedRevision must be a number", 400);
    }

    const validation = validateModulePayload(moduleKey, body.data);
    if (!validation.ok) return jsonError(validation.error, 400);

    const result = await updateModuleData(token, moduleKey, validation.data, {
      clearItemIds,
      expectedRevision,
    });

    if (!result.ok) {
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

    await logSessionEvent(session.id, "module.answers_saved", {
      actorType: "client",
      moduleInstanceId: result.meta.moduleInstanceId,
      metadata: {
        moduleKey: result.meta.moduleKey,
        moduleInstanceId: result.meta.moduleInstanceId,
        operation: result.meta.operation,
        incomingAnswerCount: result.meta.incomingAnswerCount,
        storedCountBefore: result.meta.storedCountBefore,
        storedCountAfter: result.meta.storedCountAfter,
        revision: result.meta.revision,
      },
    });

    return NextResponse.json({ module: result.module });
  } catch {
    return jsonError("Failed to save module", 500);
  }
}
