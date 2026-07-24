import { NextResponse } from "next/server";
import { jsonError, jsonNotFound } from "@/lib/api";
import { getIntakeAccessDenial } from "@/lib/intake-access";
import { MODULE_KEYS, assertKnownModuleKey, validateModulePayload } from "@/lib/modules";
import { notifyClinicianOnSubmission } from "@/lib/notifications";
import {
  getSessionByToken,
  submitModule,
} from "@/lib/episodes";

type RouteContext = { params: Promise<{ token: string; moduleKey: string }> };

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

    const moduleRecord = await submitModule(token, moduleKey, raw);
    if (!moduleRecord) {
      return jsonError("Module already submitted or not found", 409);
    }

    // Notify clinician when the screener is submitted (preserves existing workflow).
    if (moduleKey === MODULE_KEYS.SCREENER) {
      const session = await getSessionByToken(token);
      if (session) await notifyClinicianOnSubmission(session);
    }

    return NextResponse.json({ module: moduleRecord });
  } catch {
    return jsonError("Failed to submit module", 500);
  }
}
