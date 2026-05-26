import { getTimeoutMs, withTimeout } from "@/lib/with-timeout";
import { buildReportContext } from "./build-context";
import { generateLlmReport } from "./llm";
import { generateTemplateReport } from "./template";
import type { GeneratedReport, ReportGenerationInput } from "./types";

function hasLlmKey(): boolean {
  if (process.env.REPORT_USE_LLM === "false") return false;
  return Boolean(
    process.env.GEMINI_API_KEY?.trim() || process.env.ANTHROPIC_API_KEY?.trim(),
  );
}

function llmTimeoutMs(): number {
  return getTimeoutMs(process.env.REPORT_LLM_TIMEOUT_MS, 30_000);
}

export async function generateClinicalReport(
  input: ReportGenerationInput,
): Promise<GeneratedReport> {
  const context = buildReportContext(input);
  const generatedAt = new Date().toISOString();

  if (hasLlmKey()) {
    try {
      const { draft, provider } = await withTimeout(
        generateLlmReport(context, {
          profile: input.profile,
          narrativeOnly: input.narrativeOnly,
          existingDraft: input.existingDraft,
        }),
        llmTimeoutMs(),
        "AI report generation",
      );
      return { draft, source: provider, generatedAt };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "LLM report generation failed";
      if (process.env.NODE_ENV === "development") {
        console.warn("[report] LLM failed, using narrative template:", message);
      }
      const draft = generateTemplateReport(context);
      return {
        draft,
        source: "template",
        generatedAt,
        fallbackReason: message,
      };
    }
  }

  const draft = generateTemplateReport(context);
  return { draft, source: "template", generatedAt };
}
