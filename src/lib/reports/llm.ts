import type { ReportContext } from "./build-context";
import { generateAnthropicReport } from "./anthropic";
import { generateGeminiReport } from "./gemini";
import type { LlmProvider, LlmReportOptions } from "./types";

function resolveProvider(): LlmProvider | null {
  const explicit = process.env.REPORT_LLM_PROVIDER?.toLowerCase();
  if (explicit === "gemini" && process.env.GEMINI_API_KEY) return "gemini";
  if (explicit === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (explicit && explicit !== "auto") return null;

  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

export async function generateLlmReport(
  context: ReportContext,
  options?: LlmReportOptions,
): Promise<{ draft: string; provider: LlmProvider }> {
  const provider = resolveProvider();
  if (!provider) {
    throw new Error("No LLM API key configured (GEMINI_API_KEY or ANTHROPIC_API_KEY)");
  }

  const draft =
    provider === "gemini"
      ? await generateGeminiReport(context, options)
      : await generateAnthropicReport(context, options);

  return { draft, provider };
}
