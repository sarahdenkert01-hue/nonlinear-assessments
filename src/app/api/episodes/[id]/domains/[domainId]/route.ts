import { NextResponse } from "next/server";
import { requireClinicianId } from "@/lib/auth";
import { jsonError, jsonNotFound } from "@/lib/api";
import { getSessionForClinician } from "@/lib/episodes";
import type { Confidence } from "@/lib/findings/types";
import {
  addManualDomainEvidence,
  getDomainDetailForEpisode,
  updateDomainReview,
  type UpdateDomainReviewInput,
} from "@/lib/domains";
import { parseClinicalQuestionPrompts } from "@/lib/domains/clinical-questions";
import type { ClinicalQuestionPrompt } from "@/lib/domains/types";

type RouteContext = { params: Promise<{ id: string; domainId: string }> };

const VALID_CONFIDENCE: Confidence[] = ["LOW", "MODERATE", "HIGH"];

export async function GET(_request: Request, context: RouteContext) {
  try {
    const clinicianId = await requireClinicianId();
    const { id, domainId } = await context.params;
    const session = await getSessionForClinician(id, clinicianId);
    if (!session) return jsonNotFound("Episode");

    const domain = await getDomainDetailForEpisode(id, domainId);
    if (!domain) return jsonNotFound("Domain");

    return NextResponse.json({ domain });
  } catch (err) {
    return handleError(err, "GET /api/episodes/:id/domains/:domainId");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const clinicianId = await requireClinicianId();
    const { id, domainId } = await context.params;
    const body = await parseBody(request);
    const input: UpdateDomainReviewInput = {};

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

    if ("clinicalNotes" in body) {
      input.clinicalNotes =
        typeof body.clinicalNotes === "string" && body.clinicalNotes.trim()
          ? body.clinicalNotes.trim()
          : null;
    }

    if ("evidenceGapNotes" in body) {
      input.evidenceGapNotes =
        typeof body.evidenceGapNotes === "string" && body.evidenceGapNotes.trim()
          ? body.evidenceGapNotes.trim()
          : null;
    }

    if ("evidenceSummaryDraft" in body) {
      input.evidenceSummaryDraft =
        typeof body.evidenceSummaryDraft === "string" && body.evidenceSummaryDraft.trim()
          ? body.evidenceSummaryDraft.trim()
          : null;
    }

    if ("suggestedQuestionsDraft" in body) {
      input.suggestedQuestionsDraft =
        typeof body.suggestedQuestionsDraft === "string" && body.suggestedQuestionsDraft.trim()
          ? body.suggestedQuestionsDraft.trim()
          : null;
    }

    if ("clinicalQuestionPrompts" in body) {
      if (!Array.isArray(body.clinicalQuestionPrompts)) {
        return jsonError("clinicalQuestionPrompts must be an array", 400);
      }
      input.clinicalQuestionPrompts = parseClinicalQuestionPrompts(
        body.clinicalQuestionPrompts,
      ) as ClinicalQuestionPrompt[];
    }

    if ("summaryDraft" in body) {
      input.summaryDraft =
        typeof body.summaryDraft === "string" && body.summaryDraft.trim()
          ? body.summaryDraft.trim()
          : null;
    }

    if (body.reviewed === true) input.reviewed = true;
    if (body.reviewed === false) input.reviewed = false;

    const domain = await updateDomainReview(id, domainId, clinicianId, input);
    if (!domain) return jsonNotFound("Domain");

    return NextResponse.json({ domain });
  } catch (err) {
    return handleError(err, "PATCH /api/episodes/:id/domains/:domainId");
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const clinicianId = await requireClinicianId();
    const { id, domainId } = await context.params;
    const session = await getSessionForClinician(id, clinicianId);
    if (!session) return jsonNotFound("Episode");

    const body = await parseBody(request);
    const excerpt = typeof body.excerpt === "string" ? body.excerpt.trim() : "";
    if (!excerpt) return jsonError("excerpt is required", 400);

    const domain = await addManualDomainEvidence(id, domainId, clinicianId, excerpt);
    if (!domain) return jsonNotFound("Domain");

    return NextResponse.json({ domain });
  } catch (err) {
    return handleError(err, "POST /api/episodes/:id/domains/:domainId");
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
