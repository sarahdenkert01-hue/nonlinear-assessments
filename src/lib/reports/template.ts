import type { ReportContext } from "./build-context";
import { assembleClinicalReport } from "./assemble";

/** Deterministic narrative draft when no LLM is available or the LLM call fails. */
export function generateTemplateReport(context: ReportContext): string {
  return assembleClinicalReport(context, {
    sourceNote: " using structured template synthesis (no LLM)",
  });
}
