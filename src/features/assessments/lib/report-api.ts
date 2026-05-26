import { parseApiResponse } from "@/lib/parse-api-response";
import { fetchWithTimeout } from "@/lib/with-timeout";
import type {
  AssessmentAnswers,
  AssessmentReportResult,
  ClinicianOverrides,
} from "../types";

const REPORT_REQUEST_TIMEOUT_MS = 60_000;

function wrapReportFetchError(err: unknown): Error {
  if (err instanceof Error) {
    if (err.name === "TimeoutError" || /timed out/i.test(err.message)) {
      return new Error(
        "Report generation timed out. Try again, or add REPORT_USE_LLM=false to .env for a fast template-only draft.",
      );
    }
    return err;
  }
  return new Error("Failed to generate report");
}

async function postReport(
  url: string,
  body: unknown,
): Promise<AssessmentReportResult> {
  try {
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      timeoutMs: REPORT_REQUEST_TIMEOUT_MS,
    });

    const data = await parseApiResponse<{
      error?: string;
      report?: AssessmentReportResult;
    }>(res);

    if (!res.ok) {
      throw new Error(data.error ?? "Failed to generate report");
    }

    if (!data.report) {
      throw new Error("Report was not returned by the server");
    }

    return data.report;
  } catch (err) {
    throw wrapReportFetchError(err);
  }
}

export async function requestSessionReport(
  sessionId: string,
  payload?: {
    overrides: ClinicianOverrides;
    clinicianNotes?: string;
    narrativeOnly?: boolean;
    profile?: "brief" | "standard" | "detailed";
  },
): Promise<AssessmentReportResult> {
  return postReport(`/api/assessments/${sessionId}/report`, payload ?? {});
}

export async function requestDevPreviewReport(input: {
  answers: AssessmentAnswers;
  overrides: ClinicianOverrides;
  clinicianNotes?: string;
  clientName?: string;
}): Promise<AssessmentReportResult> {
  return postReport("/api/dev/report", input);
}
