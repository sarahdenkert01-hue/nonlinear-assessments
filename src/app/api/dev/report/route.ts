import { NextResponse } from "next/server";
import type {
  AssessmentAnswers,
  ClinicianOverrides,
} from "@/features/assessments";
import { jsonError } from "@/lib/api";
import { generateClinicalReport } from "@/lib/reports/generate";

/** Dev-only: generate a report from in-memory preview data (no session required). */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return jsonError("Not found", 404);
  }

  try {
    const body = await request.json();
    const answers = (body.answers ?? {}) as AssessmentAnswers;
    const overrides = (body.overrides ?? {}) as ClinicianOverrides;
    const clinicianNotes =
      typeof body.clinicianNotes === "string" ? body.clinicianNotes : undefined;
    const clientName =
      typeof body.clientName === "string" ? body.clientName : "Preview client";

    const report = await generateClinicalReport({
      clientName,
      answers,
      overrides,
      resolvedThemes: [],
      clinicianNotes,
    });

    return NextResponse.json({ report });
  } catch {
    return jsonError("Failed to generate report", 500);
  }
}
