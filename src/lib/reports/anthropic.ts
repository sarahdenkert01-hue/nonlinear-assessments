import { fetchWithTimeout, getTimeoutMs } from "@/lib/with-timeout";
import type { ReportContext } from "./build-context";
import type { LlmReportOptions } from "./types";
import { buildReportPrompt } from "./prompt";

const LLM_FETCH_TIMEOUT_MS = () =>
  getTimeoutMs(process.env.REPORT_LLM_TIMEOUT_MS, 30_000);

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-20250514";

export async function generateAnthropicReport(
  context: ReportContext,
  options?: LlmReportOptions,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;

  const response = await fetchWithTimeout(ANTHROPIC_API_URL, {
    method: "POST",
    timeoutMs: LLM_FETCH_TIMEOUT_MS(),
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: buildReportPrompt(context, {
            profile: options?.profile,
            narrativeOnly: options?.narrativeOnly,
            existingDraft: options?.existingDraft,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Anthropic request failed (${response.status}): ${detail.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    content?: { type: string; text?: string }[];
  };

  const text = data.content
    ?.filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Anthropic returned an empty report");
  }

  return text;
}
