import { NextResponse } from "next/server";
import { jsonError, jsonNotFound } from "@/lib/api";
import { getIntakeAccessDenial } from "@/lib/intake-access";
import { acceptSessionConsent, getSessionByToken } from "@/lib/episodes";

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const existing = await getSessionByToken(token);
  if (!existing) return jsonNotFound("Intake session");

  const denial = getIntakeAccessDenial(existing);
  if (denial === "revoked") {
    return jsonError("This intake link has been revoked", 410);
  }
  if (denial === "expired") {
    return jsonError("This intake link has expired", 410);
  }

  if (existing.consentAcceptedAt) {
    return NextResponse.json({ session: existing });
  }

  if (existing.status !== "DRAFT") {
    return jsonError("Consent can only be recorded before submission", 409);
  }

  const session = await acceptSessionConsent(token);
  if (!session) return jsonError("Could not record consent", 409);

  return NextResponse.json({ session });
}
