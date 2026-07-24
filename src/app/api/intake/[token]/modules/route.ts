import { NextResponse } from "next/server";
import { jsonError, jsonNotFound } from "@/lib/api";
import { getIntakeAccessDenial } from "@/lib/intake-access";
import { getClientEpisodeByToken, getSessionByToken } from "@/lib/episodes";

type RouteContext = { params: Promise<{ token: string }> };

/** List all client modules for the token-authorized episode (journey dashboard). */
export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const session = await getSessionByToken(token);
  if (!session) return jsonNotFound("Intake session");
  const denial = getIntakeAccessDenial(session);
  if (denial) {
    return jsonError(denial === "revoked" ? "Link revoked" : "Link expired", 410);
  }
  if (!session.consentAcceptedAt) {
    return jsonError("Consent required", 403);
  }

  const episode = await getClientEpisodeByToken(token);
  if (!episode) return jsonNotFound("Intake session");
  return NextResponse.json({ episode });
}
