import { NextResponse } from "next/server";
import { requireClinicianId } from "@/lib/auth";
import { jsonError, jsonNotFound } from "@/lib/api";
import { getSessionForClinician } from "@/lib/episodes";
import {
  addFinding,
  ensureFindingsForEpisode,
  listFindingsForEpisode,
  updateFinding,
  type Confidence,
  type FindingStatus,
  type UpdateFindingInput,
} from "@/lib/findings";

type RouteContext = { params: Promise<{ id: string }> };

const VALID_STATUS: FindingStatus[] = ["PROPOSED", "ACCEPTED", "EDITED", "EXCLUDED"];
const VALID_CONFIDENCE: Confidence[] = ["LOW", "MODERATE", "HIGH"];

// List findings for an episode, generating them on first access (idempotent).
export async function GET(_request: Request, context: RouteContext) {
  try {
    const clinicianId = await requireClinicianId();
    const { id } = await context.params;
    const session = await getSessionForClinician(id, clinicianId);
    if (!session) return jsonNotFound("Episode");

    await ensureFindingsForEpisode(id);
    const findings = await listFindingsForEpisode(id);
    return NextResponse.json({ findings });
  } catch (err) {
    return handleError(err, "GET /api/episodes/:id/findings");
  }
}

// Update one finding (status / confidence / alternative explanations / rationale). The finding
// itself is scoped to the clinician's episodes inside updateFinding, so the episode id in the URL
// is not needed here.
export async function PATCH(request: Request) {
  try {
    const clinicianId = await requireClinicianId();
    const body = await parseBody(request);

    const findingId = typeof body.findingId === "string" ? body.findingId : null;
    if (!findingId) return jsonError("findingId is required", 400);

    const input: UpdateFindingInput = {};

    if (typeof body.status === "string") {
      if (!VALID_STATUS.includes(body.status as FindingStatus)) {
        return jsonError("Invalid status", 400);
      }
      input.status = body.status as FindingStatus;
    }

    if ("confidence" in body) {
      if (body.confidence === null) {
        input.confidence = null;
      } else if (
        typeof body.confidence === "string" &&
        VALID_CONFIDENCE.includes(body.confidence as Confidence)
      ) {
        input.confidence = body.confidence as Confidence;
      } else {
        return jsonError("Invalid confidence", 400);
      }
    }

    if (Array.isArray(body.alternativeExplanations)) {
      input.alternativeExplanations = body.alternativeExplanations
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim())
        .filter(Boolean);
    }

    if ("rationale" in body) {
      input.rationale =
        typeof body.rationale === "string" && body.rationale.trim()
          ? body.rationale.trim()
          : null;
    }

    const finding = await updateFinding(findingId, clinicianId, input);
    if (!finding) return jsonNotFound("Finding");
    return NextResponse.json({ finding });
  } catch (err) {
    return handleError(err, "PATCH /api/episodes/:id/findings");
  }
}

// Add a clinician finding for a theme the algorithm did not flag.
export async function POST(request: Request, context: RouteContext) {
  try {
    const clinicianId = await requireClinicianId();
    const { id } = await context.params;
    const session = await getSessionForClinician(id, clinicianId);
    if (!session) return jsonNotFound("Episode");

    const body = await parseBody(request);
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!code) return jsonError("code is required", 400);

    const finding = await addFinding(id, clinicianId, {
      code,
      label: typeof body.label === "string" ? body.label.trim() : code,
      category: typeof body.category === "string" ? body.category : undefined,
    });
    if (!finding) return jsonNotFound("Episode");
    return NextResponse.json({ finding });
  } catch (err) {
    return handleError(err, "POST /api/episodes/:id/findings");
  }
}

function handleError(err: unknown, label: string) {
  if (process.env.NODE_ENV === "development") {
    console.error(`[${label}]`, err);
  }
  if (err instanceof Error && err.message === "Unauthorized") {
    return jsonError("Unauthorized", 401);
  }
  const message = err instanceof Error ? err.message : "Request failed";
  return jsonError(message, 500);
}

async function parseBody(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (!text.trim()) return {};
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
