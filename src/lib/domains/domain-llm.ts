import { fetchWithTimeout, getTimeoutMs } from "@/lib/with-timeout";

export type DomainLlmSource = "gemini" | "anthropic" | "template";

export function hasDomainLlmKey(): boolean {
  if (process.env.REPORT_USE_LLM === "false") return false;
  return Boolean(
    process.env.GEMINI_API_KEY?.trim() || process.env.ANTHROPIC_API_KEY?.trim(),
  );
}

export function resolveDomainLlmProvider(): "gemini" | "anthropic" | null {
  const explicit = process.env.REPORT_LLM_PROVIDER?.toLowerCase();
  if (explicit === "gemini" && process.env.GEMINI_API_KEY) return "gemini";
  if (explicit === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (explicit && explicit !== "auto") return null;
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

function llmTimeoutMs(): number {
  return getTimeoutMs(process.env.REPORT_LLM_TIMEOUT_MS, 30_000);
}

async function callGemini(prompt: string, maxOutputTokens: number): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    timeoutMs: llmTimeoutMs(),
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens },
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
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}

async function callAnthropic(prompt: string, maxOutputTokens: number): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";
  const response = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    timeoutMs: llmTimeoutMs(),
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxOutputTokens,
      messages: [{ role: "user", content: prompt }],
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
  if (!text) throw new Error("Anthropic returned an empty response");
  return text;
}

export async function callDomainLlm(
  prompt: string,
  maxOutputTokens = 1024,
): Promise<{ text: string; source: Exclude<DomainLlmSource, "template"> }> {
  const provider = resolveDomainLlmProvider();
  if (!provider) throw new Error("No LLM API key configured");
  const text =
    provider === "gemini"
      ? await callGemini(prompt, maxOutputTokens)
      : await callAnthropic(prompt, maxOutputTokens);
  return { text, source: provider };
}

export async function callDomainLlmWithFallback(
  prompt: string,
  templateFallback: () => string,
  maxOutputTokens = 1024,
): Promise<{ text: string; source: DomainLlmSource; fallbackReason?: string }> {
  if (!hasDomainLlmKey() || !resolveDomainLlmProvider()) {
    return { text: templateFallback(), source: "template" };
  }
  try {
    const { text, source } = await callDomainLlm(prompt, maxOutputTokens);
    return { text, source };
  } catch (err) {
    const message = err instanceof Error ? err.message : "LLM request failed";
    if (process.env.NODE_ENV === "development") {
      console.warn("[domain] LLM failed, using template:", message);
    }
    return { text: templateFallback(), source: "template", fallbackReason: message };
  }
}
