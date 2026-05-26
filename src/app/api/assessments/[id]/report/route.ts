import { NextResponse } from "next/server";
import type { ClinicianOverrides } from "@/features/assessments";
import { logSessionEvent } from "@/lib/audit";
import { requireClinicianId } from "@/lib/auth";
import { jsonError, jsonNotFound } from "@/lib/api";
import { generateClinicalReport } from "@/lib/reports/generate";
import { getSessionForClinician, saveSessionReport } from "@/lib/sessions";

type RouteContext = { params: Promise<{ id: string }> };

/** Allow enough time for LLM + template fallback (local dev; Vercel may cap lower on hobby). */
export const maxDuration = 60;

export async function POST(request: Request, context: RouteContext) {
  try {
    const clinicianId = await requireClinicianId();
    const { id } = await context.params;
    const session = await getSessionForClinician(id, clinicianId);

    if (!session) return jsonNotFound("Session");
    if (session.status === "DRAFT") {
      return jsonError("Intake must be submitted before generating a report", 409);
    }
    if (session.reportFinalizedAt) {
      return jsonError("Report is finalized; unlock before regenerating", 409);
    }

    const body = await parseRequestBody(request);

    const overrides =
      body.overrides && typeof body.overrides === "object"
        ? (body.overrides as ClinicianOverrides)
        : ((session.overrides ?? {}) as ClinicianOverrides);
    const clinicianNotes =
      typeof body.clinicianNotes === "string"
        ? body.clinicianNotes
        : (session.clinicianNotes ?? undefined);

    const profile =
      body.profile === "brief" || body.profile === "detailed"
        ? body.profile
        : body.profile === "standard"
          ? "standard"
          : undefined;

    const report = await generateClinicalReport({
      clientName: session.clientName ?? undefined,
      answers: session.answers,
      overrides,
      resolvedThemes: [],
      clinicianNotes,
      profile:
        profile ??
        (process.env.REPORT_PROFILE === "brief" ||
        process.env.REPORT_PROFILE === "detailed"
          ? process.env.REPORT_PROFILE
          : "standard"),
      narrativeOnly: body.narrativeOnly === true,
      existingDraft:
        body.narrativeOnly === true ? session.reportDraft ?? undefined : undefined,
    });

    const updated = await saveSessionReport(
      id,
      clinicianId,
      report.draft,
      new Date(report.generatedAt),
    );

    if (!updated) return jsonError("Failed to save report", 500);

    await logSessionEvent(id, "review.report_generated", {
      actorType: "clinician",
      actorId: clinicianId,
      metadata: { source: report.source },
    });

    return NextResponse.json({
      report: {
        draft: report.draft,
        source: report.source,
        generatedAt: report.generatedAt,
        ...(report.fallbackReason
          ? { fallbackReason: report.fallbackReason }
          : {}),
      },
      session: updated,
    });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[POST /api/assessments/:id/report]", err);
    }
    if (err instanceof Error && err.message === "Unauthorized") {
      return jsonError("Unauthorized", 401);
    }
    const message =
      err instanceof Error ? err.message : "Failed to generate report";
    return jsonError(message, 500);
  }
}

async function parseRequestBody(request: Request): Promise<Record<string, unknown>> {
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
