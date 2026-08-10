import type { ThemeReportContext } from "./build-context";

/** Themes whose ### heading is missing from a markdown fragment. */
export function extractMissingThemeIds(
  markdown: string,
  themes: ThemeReportContext[],
): string[] {
  return themes
    .filter((theme) => {
      const heading = `### ${theme.label}`;
      return !markdown.includes(heading);
    })
    .map((theme) => theme.id);
}

/**
 * Append deterministic theme narratives for any themes omitted from markdown.
 * Does not rewrite existing sections.
 */
export function ensureThemeCoverage(
  markdown: string,
  themes: ThemeReportContext[],
  renderTheme: (theme: ThemeReportContext) => string,
): string {
  const missing = themes.filter((theme) => !markdown.includes(`### ${theme.label}`));
  if (missing.length === 0) return markdown;

  const additions = missing.map(renderTheme).join("\n\n");
  const base = markdown.trim();
  if (!base || base.startsWith("_No themes")) {
    return missing.map(renderTheme).join("\n\n");
  }
  return `${base}\n\n${additions}`;
}
