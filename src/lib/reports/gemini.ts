import { fetchWithTimeout, getTimeoutMs } from "@/lib/with-timeout";
import type { ReportContext } from "./build-context";
import type { LlmReportOptions } from "./types";
import { buildReportPrompt } from "./prompt";

const DEFAULT_MODEL = "gemini-2.5-flash-lite";
const LLM_FETCH_TIMEOUT_MS = () =>
  getTimeoutMs(process.env.REPORT_LLM_TIMEOUT_MS, 30_000);

export async function generateGeminiReport(
  context: ReportContext,
  options?: LlmReportOptions,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    timeoutMs: LLM_FETCH_TIMEOUT_MS(),
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: buildReportPrompt(context, {
                profile: options?.profile,
                narrativeOnly: options?.narrativeOnly,
                existingDraft: options?.existingDraft,
              }),
            },
          ],
        },
      ],
      generationConfig: { maxOutputTokens: 2048 },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${detail.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini returned an empty report");
  }

  return text;
}
