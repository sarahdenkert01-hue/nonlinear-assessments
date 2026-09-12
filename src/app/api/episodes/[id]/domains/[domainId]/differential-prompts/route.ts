import { NextResponse } from "next/server";
import { requireClinicianId } from "@/lib/auth";
import { jsonError, jsonNotFound } from "@/lib/api";
import { getSessionForClinician } from "@/lib/episodes";
import { getDomainDetailForEpisode } from "@/lib/domains";
import {
  formatDifferentialPromptsDraft,
  generateDifferentialPrompts,
} from "@/lib/domains/suggest-differentials";
import { isQuestionTriggered } from "@/features/assessments/lib/scoring";
import { QUESTIONS } from "@/features/assessments/data/questions";
import { isAssessmentQuestion } from "@/features/assessments/types";
import { prisma } from "@/lib/prisma";
import { responsesToAnswers } from "@/lib/episodes/responses";

type RouteContext = { params: Promise<{ id: string; domainId: string }> };

async function clientEndorsedAcquiredEfChange(episodeId: string): Promise<boolean> {
  const episode = await prisma.assessmentEpisode.findUnique({
    where: { id: episodeId },
    include: { modules: { include: { responses: true } } },
  });
  const screener = episode?.modules.find((m) => m.moduleKey === "nonlinear-screener");
  if (!screener) return false;
  const answers = responsesToAnswers(screener.responses);
  const q62 = QUESTIONS.find((q) => isAssessmentQuestion(q) && q.id === "q62");
  if (!q62 || !isAssessmentQuestion(q62)) return false;
  return isQuestionTriggered(q62, answers.q62);
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const clinicianId = await requireClinicianId();
    const { id, domainId } = await context.params;
    const session = await getSessionForClinician(id, clinicianId);
    if (!session) return jsonNotFound("Episode");

    const detail = await getDomainDetailForEpisode(id, domainId);
    if (!detail) return jsonNotFound("Domain");

    const acquiredEfChangeEndorsed = await clientEndorsedAcquiredEfChange(id);

    const result = await generateDifferentialPrompts({
      domainLabel: detail.label,
      domainDescription: detail.description,
      findings: detail.findings,
      acquiredEfChangeEndorsed,
    });

    return NextResponse.json({
      prompts: result.prompts,
      draft: formatDifferentialPromptsDraft(result.prompts),
      source: result.source,
      generatedAt: result.generatedAt,
      fallbackReason: result.fallbackReason,
    });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[POST /api/episodes/:id/domains/:domainId/differential-prompts]", err);
    }
    if (err instanceof Error && err.message === "Unauthorized") {
      return jsonError("Unauthorized", 401);
    }
    const message = err instanceof Error ? err.message : "Request failed";
    return jsonError(message, 500);
  }
}
