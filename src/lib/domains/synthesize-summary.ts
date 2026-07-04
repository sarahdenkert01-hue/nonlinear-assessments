import { fetchWithTimeout, getTimeoutMs } from "@/lib/with-timeout";
import type { DomainEvidenceItem, DomainFindingRef } from "./types";

export interface EvidenceSummaryContext {
  domainLabel: string;
  domainDescription: string;
  findings: DomainFindingRef[];
  supplementalEvidence: DomainEvidenceItem[];
}

export type EvidenceSummarySource = "gemini" | "anthropic" | "template";

export interface GeneratedEvidenceSummary {
  draft: string;
  source: EvidenceSummarySource;
  generatedAt: string;
  fallbackReason?: string;
}

function hasLlmKey(): boolean {
  if (process.env.REPORT_USE_LLM === "false") return false;
  return Boolean(
    process.env.GEMINI_API_KEY?.trim() || process.env.ANTHROPIC_API_KEY?.trim(),
  );
}

function resolveProvider(): "gemini" | "anthropic" | null {
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

function buildEvidenceSummaryPrompt(ctx: EvidenceSummaryContext): string {
  const findingBlocks = ctx.findings.map((f) => {
    const evidenceLines = f.evidence
      .map((e) => `  - Q: ${e.text}\n    A: ${e.answer || "(no response)"}`)
      .join("\n");
    return `- ${f.label} (${f.hits}/${f.total} indicators)\n${evidenceLines || "  (no item-level evidence)"}`;
  });

  const supplemental = ctx.supplementalEvidence
    .filter((e) => e.excerpt?.trim())
    .map((e) => `- [${e.sourceType}] ${e.excerpt}`)
    .join("\n");

  return `You are assisting a clinician synthesizing confirmed assessment findings into a domain-level evidence summary.

DOMAIN: ${ctx.domainLabel}
DESCRIPTION: ${ctx.domainDescription}

CONFIRMED FINDINGS AND SUPPORTING RESPONSES:
${findingBlocks.length > 0 ? findingBlocks.join("\n\n") : "(none)"}

${supplemental ? `ADDITIONAL EVIDENCE:\n${supplemental}\n` : ""}
Write a concise clinical evidence summary (2–4 short paragraphs) that:
- Integrates the confirmed findings and supporting responses
- Uses neutral, descriptive language (patterns, behaviors, self-report)
- Does NOT diagnose, label the client, or state diagnostic conclusions
- Does NOT recommend treatment or next steps
- Does NOT assign confidence levels

This is an AI draft for clinician review — write in third person about "the client" where needed.`;
}

export function generateTemplateEvidenceSummary(ctx: EvidenceSummaryContext): string {
  const lines: string[] = [
    `Evidence summary for ${ctx.domainLabel}.`,
    "",
    "The following confirmed findings support review of this domain:",
  ];

  if (ctx.findings.length === 0) {
    lines.push("- No confirmed findings are linked to this domain yet.");
  } else {
    for (const f of ctx.findings) {
      lines.push(`- ${f.label} (${f.hits} of ${f.total} indicators endorsed).`);
      for (const e of f.evidence.slice(0, 3)) {
        lines.push(`  · "${e.text}" — ${e.answer || "no response recorded"}`);
      }
      if (f.evidence.length > 3) {
        lines.push(`  · …and ${f.evidence.length - 3} additional item(s).`);
      }
    }
  }

  const notes = ctx.supplementalEvidence.filter((e) => e.excerpt?.trim());
  if (notes.length > 0) {
    lines.push("", "Additional clinician or collateral notes:");
    for (const n of notes) {
      lines.push(`- ${n.excerpt}`);
    }
  }

  lines.push(
    "",
    "Clinician review is required before this summary is used in a report.",
  );

  return lines.join("\n");
}

async function callGemini(prompt: string): Promise<string> {
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
      generationConfig: { maxOutputTokens: 1024 },
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
  if (!text) throw new Error("Gemini returned an empty summary");
  return text;
}

async function callAnthropic(prompt: string): Promise<string> {
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
      max_tokens: 1024,
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
  if (!text) throw new Error("Anthropic returned an empty summary");
  return text;
}

export async function generateDomainEvidenceSummary(
  ctx: EvidenceSummaryContext,
): Promise<GeneratedEvidenceSummary> {
  const generatedAt = new Date().toISOString();

  if (hasLlmKey()) {
    const provider = resolveProvider();
    if (provider) {
      try {
        const prompt = buildEvidenceSummaryPrompt(ctx);
        const draft =
          provider === "gemini" ? await callGemini(prompt) : await callAnthropic(prompt);
        return { draft, source: provider, generatedAt };
      } catch (err) {
        const message = err instanceof Error ? err.message : "LLM evidence summary failed";
        if (process.env.NODE_ENV === "development") {
          console.warn("[domain] LLM evidence summary failed, using template:", message);
        }
        return {
          draft: generateTemplateEvidenceSummary(ctx),
          source: "template",
          generatedAt,
          fallbackReason: message,
        };
      }
    }
  }

  return {
    draft: generateTemplateEvidenceSummary(ctx),
    source: "template",
    generatedAt,
  };
}
