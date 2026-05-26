import { requireClinicianId } from "@/lib/auth";
import { jsonError, jsonNotFound } from "@/lib/api";
import { getSessionForClinician } from "@/lib/sessions";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const clinicianId = await requireClinicianId();
    const { id } = await context.params;
    const session = await getSessionForClinician(id, clinicianId);
    if (!session) return jsonNotFound("Session");

    const content =
      session.reportFinal ?? session.reportDraft ?? "";
    if (!content.trim()) {
      return jsonError("No report to export", 404);
    }

    const filename = `${(session.clientName ?? "report").replace(/[^\w.-]+/g, "_")}-assessment.txt`;
    return new Response(content, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return jsonError("Unauthorized", 401);
    }
    return jsonError("Export failed", 500);
  }
}
