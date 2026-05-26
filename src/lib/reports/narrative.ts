import type { ReportContext, ThemeReportContext } from "./build-context";

const THEME_FRAMING: Record<string, string> = {
  masking:
    "effortful suppression or adjustment of natural presentation in social and professional settings",
  "executive-dysfunction":
    "difficulty initiating, sequencing, and sustaining goal-directed behavior despite motivation",
  "sensory-dysregulation":
    "heightened or unpredictable sensory responses that drain capacity for other demands",
  "neurodivergent-burnout":
    "cumulative depletion from sustained adaptation without adequate recovery",
  "trauma-overlap":
    "overlap between trauma-related vigilance and neurodivergent stress responses",
  "chronic-overcompensation":
    "long-standing over-effort to meet expectations at significant personal cost",
  "identity-confusion":
    "uncertainty about authentic preferences, roles, and self-definition",
  "social-hyperanalysis":
    "excessive monitoring and post-event review of social interactions",
  "task-paralysis":
    "knowing what to do but being unable to initiate or complete tasks",
  "masking-fatigue":
    "exhaustion specifically tied to maintaining a socially acceptable presentation",
  "social-processing-exhaustion":
    "depletion after interpreting social cues, norms, and relational subtext",
  "chronic-hypervigilance":
    "sustained threat monitoring that limits rest and cognitive flexibility",
  "relational-safety":
    "adaptations in closeness and trust based on past relational threat",
  "shutdown-collapse":
    "episodes of reduced communication, withdrawal, or functional drop-off under overload",
  "emotional-dysregulation":
    "difficulty modulating emotional intensity and recovery after activation",
  "perfectionistic-compensation":
    "using exceptional standards or over-preparation to offset perceived deficits",
  "identity-suppression":
    "habitual muting of authentic needs, interests, or expression",
  "nervous-system-dysregulation":
    "body-based arousal patterns that interfere with focus, sleep, or comfort",
  "rejection-sensitivity":
    "intense distress or rumination in response to perceived rejection or criticism",
  "emotional-suppression":
    "compartmentalizing or delaying emotional processing until capacity returns",
  "burnout-recovery":
    "prolonged recovery timelines after depletion, with difficulty regaining baseline",
  "cognitive-overload":
    "mental fatigue when demands exceed available processing bandwidth",
  "functional-inconsistency":
    "marked variability in performance or capacity across days or contexts",
  "chronic-shame":
    "persistent self-criticism and fear of being fundamentally flawed",
  "emotional-flooding":
    "rapid emotional surges that are hard to down-regulate in the moment",
  "identity-fragmentation":
    "sense of self that shifts substantially across roles or relationships",
};

function formatExamples(theme: ThemeReportContext): string {
  const top = theme.endorsedItems.slice(0, 3);
  if (top.length === 0) return "";

  return top
    .map((item) => `“${item.text}” (endorsed: ${item.answer})`)
    .join("; ");
}

function themeNarrative(theme: ThemeReportContext): string {
  const framing =
    THEME_FRAMING[theme.id] ??
    `clinically relevant patterns in the area of ${theme.label.toLowerCase()}`;

  if (theme.endorsedItems.length === 0) {
    return `### ${theme.label}

This theme was **included by the clinician** although no scorable intake items were endorsed under it. That may reflect interview findings, collateral, or clinical judgment not fully captured in the questionnaire. In session, it would be useful to clarify what specifically prompted inclusion and how ${framing} shows up in daily life.

_Supporting indicators: none from intake (clinician override)._`;
  }

  const examples = formatExamples(theme);
  const density =
    theme.hits >= 3
      ? "multiple converging"
      : theme.hits === 2
        ? "consistent"
        : "emerging";

  const categoryNote =
    theme.category === "Both"
      ? "with relevance to both attentional/regulatory and social-cognitive domains"
      : `within the ${theme.category} domain`;

  return `### ${theme.label}

Intake responses suggest **${density} indicators** of ${framing} (${categoryNote}). The client endorsed ${theme.hits} of ${theme.total} mapped scorable items for this theme. Taken together, the pattern is consistent with meaningful difficulty in this area rather than an isolated complaint — for example, ${examples}.

From a clinical standpoint, this profile may warrant exploration of how ${theme.label.toLowerCase()} affects routines, relationships, work or school performance, and recovery after stress. Useful interview prompts include: when symptoms are worst, what compensatory strategies are used, and what happens when those strategies fail. Any formal conclusions should integrate live interview, developmental history, and rule-outs — this draft does not assign a diagnosis.

_Supporting indicators: ${theme.endorsedItems.map((i) => i.id).join(", ")}._`;
}

function crossCuttingSummary(context: ReportContext): string {
  const { themes } = context;
  if (themes.length === 0) {
    return "No clinical themes were selected for inclusion in this report. Consider whether additional intake review or clinician-driven theme selection is needed before finalizing documentation.";
  }

  const categories = {
    Autism: themes.filter((t) => t.category === "Autism").length,
    ADHD: themes.filter((t) => t.category === "ADHD").length,
    Both: themes.filter((t) => t.category === "Both").length,
  };

  const parts: string[] = [];
  if (categories.Autism > 0) parts.push(`${categories.Autism} autism-related theme(s)`);
  if (categories.ADHD > 0) parts.push(`${categories.ADHD} ADHD-related theme(s)`);
  if (categories.Both > 0) parts.push(`${categories.Both} cross-cutting theme(s)`);

  const totalEndorsed = themes.reduce((n, t) => n + t.endorsedItems.length, 0);
  const overrideCount = themes.filter((t) => t.source.startsWith("clinician")).length;

  let summary = `The intake profile highlights ${themes.length} included clinical theme(s) (${parts.join(", ")}), drawing on ${totalEndorsed} endorsed scorable item(s) across those themes.`;

  if (overrideCount > 0) {
    summary += ` ${overrideCount} theme(s) reflect explicit clinician include/exclude decisions beyond the algorithm alone, which should be weighted heavily in the final formulation.`;
  }

  if (categories.Autism > 0 && categories.ADHD > 0) {
    summary +=
      " Because both social-cognitive/adaptation themes and executive-regulatory themes appear, differential exploration of autism, ADHD, and combined presentations is clinically reasonable.";
  } else if (categories.Autism >= 2) {
    summary +=
      " The concentration of social-cognitive and sensory-adaptation themes suggests prioritizing autism-spectrum-informed assessment while remaining open to trauma, anxiety, and mood differentials.";
  } else if (categories.ADHD >= 2) {
    summary +=
      " The concentration of executive-regulatory themes suggests prioritizing ADHD-informed assessment while screening for sleep, mood, anxiety, and learning factors that mimic attention difficulties.";
  }

  summary +=
    " Functional questions for follow-up: impact on employment or education, relationship strain, daily living skills, and what supports (or lack thereof) are currently in place.";

  return summary;
}

export function buildNarrativeSections(context: ReportContext): {
  summary: string;
  themeSections: string;
} {
  const themeSections = context.themes.map(themeNarrative).join("\n\n");

  return {
    summary: crossCuttingSummary(context),
    themeSections:
      themeSections || "_No themes were included for narrative formulation._",
  };
}
