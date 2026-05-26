import { QUESTIONS } from "../data/questions";
import { THEMES } from "../data/themes";
import {
  isAssessmentQuestion,
  isSectionMarker,
  type AssessmentAnswers,
  type AssessmentQuestion,
  type AssessmentSection,
  type ClinicianOverrides,
  type ResolvedTheme,
  type ThemeScore,
  type ThemeWeights,
} from "../types";

export function getScorableQuestions(): AssessmentQuestion[] {
  return QUESTIONS.filter(isAssessmentQuestion).filter((q) => q.format !== "open");
}

export function buildSections(questions = QUESTIONS): AssessmentSection[] {
  const sections: AssessmentSection[] = [];

  for (const item of questions) {
    if (isSectionMarker(item)) {
      sections.push({
        title: item.section,
        desc: item.sectionDesc,
        questions: [],
      });
    } else if (sections.length > 0) {
      sections[sections.length - 1].questions.push(item);
    }
  }

  return sections;
}

export function isQuestionTriggered(
  question: AssessmentQuestion,
  answer: string | undefined,
): boolean {
  if (!answer || question.format === "open" || !question.flag) {
    return false;
  }

  if (question.format === "frequency") {
    return question.flag.frequency?.includes(answer) ?? false;
  }

  if (question.format === "agreement") {
    return question.flag.agreement?.includes(answer) ?? false;
  }

  return false;
}

function emptyWeights(): ThemeWeights {
  return { primary: 0, contributing: 0, total: 0 };
}

function isThemeFlagged(hits: number, triggerMode: "single" | "2of3"): boolean {
  if (triggerMode === "single") return hits >= 1;
  if (triggerMode === "2of3") return hits >= 2;
  return false;
}

/** Score all themes from client answers using single-item and convergence rules. */
export function computeThemeScores(answers: AssessmentAnswers): ThemeScore[] {
  const themeHits: Record<string, number> = {};
  const themeWeights: Record<string, ThemeWeights> = {};

  for (const item of QUESTIONS) {
    if (!isAssessmentQuestion(item) || item.format === "open") continue;

    const triggered = isQuestionTriggered(item, answers[item.id]);

    for (const themeId of item.themes) {
      if (!themeHits[themeId]) {
        themeHits[themeId] = 0;
        themeWeights[themeId] = emptyWeights();
      }

      const weights = themeWeights[themeId];
      weights.total++;

      if (item.weight === "primary") weights.primary++;
      else if (item.weight === "contributing") weights.contributing++;

      if (triggered) themeHits[themeId]++;
    }
  }

  return THEMES.map((theme) => {
    const hits = themeHits[theme.id] ?? 0;
    const weights = themeWeights[theme.id] ?? emptyWeights();

    return {
      ...theme,
      hits,
      total: weights.total,
      weights,
      flagged: isThemeFlagged(hits, theme.triggerMode),
    };
  });
}

/** Apply clinician include/exclude overrides to algorithmic theme scores. */
export function resolveThemesWithOverrides(
  scores: ThemeScore[],
  overrides: ClinicianOverrides = {},
): ResolvedTheme[] {
  return scores.map((score) => {
    const override = overrides[score.id] ?? null;

    if (override === "include") {
      return {
        ...score,
        included: true,
        source: "clinician-include",
      };
    }

    if (override === "exclude") {
      return {
        ...score,
        included: false,
        source: "clinician-exclude",
      };
    }

    return {
      ...score,
      included: score.flagged,
      source: "algorithm",
    };
  });
}

export function getIncludedThemes(resolved: ResolvedTheme[]): ResolvedTheme[] {
  return resolved.filter((t) => t.included);
}

/** Questions that endorsed a given theme for clinician drill-down. */
export function getTriggeredQuestionsForTheme(
  themeId: string,
  answers: AssessmentAnswers,
): AssessmentQuestion[] {
  return QUESTIONS.filter(isAssessmentQuestion).filter(
    (q) =>
      q.themes.includes(themeId) &&
      q.format !== "open" &&
      isQuestionTriggered(q, answers[q.id]),
  );
}

export function countAnsweredQuestions(answers: AssessmentAnswers): number {
  return Object.keys(answers).filter((id) => {
    const value = answers[id];
    return value !== undefined && value.trim() !== "";
  }).length;
}

