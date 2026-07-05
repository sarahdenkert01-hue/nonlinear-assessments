"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "@/lib/hooks/useDebouncedCallback";
import { parseApiResponse } from "@/lib/parse-api-response";
import { computeEvidenceCoverage } from "@/lib/domains";
import type { ClinicalFormulationDraft, ClinicalQuestionPrompt, DomainDetail, DomainSummary } from "@/lib/domains/types";
import { createQuestionPrompt } from "@/lib/domains/clinical-questions";
import "@/features/assessments/components/assessment.css";
import "../domains.css";
import { ClinicalQuestionCards } from "./clinical-question-cards";
import { DifferentialPromptList } from "./differential-prompt-list";
import { DomainStatusSidebar, type WorkspaceStage } from "./domain-status-sidebar";
import { FormulationWorkspace } from "./formulation-workspace";
import { ReportStage } from "./report-stage";
import { SupportingEvidencePanel } from "./supporting-evidence-panel";

const UNDERSTAND_SECTIONS = [
  { id: "section-know", num: "1", label: "Know" },
  { id: "section-patterns", num: "2", label: "Pattern" },
  { id: "section-opportunities", num: "3", label: "Strengthen" },
  { id: "section-questions", num: "4", label: "Ask" },
  { id: "section-differentials", num: "5", label: "Else" },
] as const;

const STAGES: { id: WorkspaceStage; label: string }[] = [
  { id: "understand", label: "Understand" },
  { id: "formulate", label: "Formulate" },
  { id: "report", label: "Report" },
];

const SHORTCUTS = [
  { keys: ["1", "6"], action: "Jump to section" },
  { keys: ["G"], action: "Generate clinical synthesis" },
  { keys: ["Q"], action: "Generate suggested questions" },
  { keys: ["D"], action: "Generate differential prompts" },
  { keys: ["C"], action: "Copy synthesis → report draft" },
];

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export function DomainWorkspaceClient({
  episodeId,
  initialDomain,
  allDomains,
}: {
  episodeId: string;
  initialDomain: DomainDetail;
  allDomains: DomainSummary[];
}) {
  const [domain, setDomain] = useState(initialDomain);
  const [altText, setAltText] = useState(initialDomain.alternativeExplanations.join("\n"));
  const [differentialPrompts, setDifferentialPrompts] = useState<string[]>([]);
  const [manualNote, setManualNote] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatingSynthesis, setGeneratingSynthesis] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [generatingDifferentials, setGeneratingDifferentials] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [stage, setStage] = useState<WorkspaceStage>("understand");
  const shortcutsRef = useRef<HTMLDivElement>(null);

  const coverage = computeEvidenceCoverage(domain.domainId, domain.sourceTypes);

  const patch = useCallback(
    async (body: Record<string, unknown>) => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch(`/api/episodes/${episodeId}/domains/${domain.domainId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await parseApiResponse<{ domain?: DomainDetail; error?: string }>(res);
        if (!res.ok || !data.domain) throw new Error(data.error ?? "Save failed");
        setDomain(data.domain);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      } finally {
        setSaving(false);
      }
    },
    [episodeId, domain.domainId],
  );

  const debouncedPatch = useDebouncedCallback(patch, 600);

  const patchQuestions = useCallback(
    (prompts: ClinicalQuestionPrompt[]) => {
      setDomain((d) => ({ ...d, clinicalQuestionPrompts: prompts }));
      debouncedPatch({ clinicalQuestionPrompts: prompts });
    },
    [debouncedPatch],
  );

  const patchFormulation = useCallback(
    (next: ClinicalFormulationDraft) => {
      setDomain((d) => ({ ...d, clinicalFormulation: next }));
      debouncedPatch({ clinicalFormulationDraft: next });
    },
    [debouncedPatch],
  );

  const scrollToSection = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const commitAlternatives = useCallback(() => {
    const next = altText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (next.join("\n") === domain.alternativeExplanations.join("\n")) return;
    void patch({ alternativeExplanations: next });
  }, [altText, domain.alternativeExplanations, patch]);

  const generateSynthesis = useCallback(async () => {
    setGeneratingSynthesis(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/episodes/${episodeId}/domains/${domain.domainId}/evidence-summary`,
        { method: "POST" },
      );
      const data = await parseApiResponse<{ domain?: DomainDetail; error?: string }>(res);
      if (!res.ok || !data.domain) throw new Error(data.error ?? "Generation failed");
      setDomain(data.domain);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGeneratingSynthesis(false);
    }
  }, [episodeId, domain.domainId]);

  const generateQuestions = useCallback(
    async (replaceAll = false) => {
      setGeneratingQuestions(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/episodes/${episodeId}/domains/${domain.domainId}/suggested-questions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ replaceAll }),
          },
        );
        const data = await parseApiResponse<{ domain?: DomainDetail; error?: string }>(res);
        if (!res.ok || !data.domain) throw new Error(data.error ?? "Generation failed");
        setDomain(data.domain);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Generation failed");
      } finally {
        setGeneratingQuestions(false);
      }
    },
    [episodeId, domain.domainId],
  );

  const generateDifferentials = useCallback(async () => {
    setGeneratingDifferentials(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/episodes/${episodeId}/domains/${domain.domainId}/differential-prompts`,
        { method: "POST" },
      );
      const data = await parseApiResponse<{ draft?: string; error?: string }>(res);
      if (!res.ok || !data.draft) throw new Error(data.error ?? "Generation failed");
      const lines = data.draft
        .split("\n")
        .map((l) => l.replace(/^[\s•\-*□]+/, "").trim())
        .filter(Boolean);
      setDifferentialPrompts(lines);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGeneratingDifferentials(false);
    }
  }, [episodeId, domain.domainId]);

  const copyFormulationSectionToReport = useCallback(
    (text: string) => {
      const existing = domain.summaryDraft?.trim();
      const next = existing ? `${existing}\n\n${text.trim()}` : text.trim();
      setDomain((d) => ({ ...d, summaryDraft: next }));
      void patch({ summaryDraft: next });
    },
    [domain.summaryDraft, patch],
  );

  const copySynthesisToReport = useCallback(() => {
    const next = domain.evidenceSummaryDraft?.trim();
    if (!next) return;
    setDomain((d) => ({ ...d, summaryDraft: next }));
    void patch({ summaryDraft: next });
  }, [domain.evidenceSummaryDraft, patch]);

  const toggleAlternative = useCallback(
    (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed) return;
      const existing = altText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const next = existing.includes(trimmed)
        ? existing.filter((l) => l !== trimmed)
        : [...existing, trimmed];
      setAltText(next.join("\n"));
      void patch({ alternativeExplanations: next });
    },
    [altText, patch],
  );

  const selectedAlternatives = new Set(
    altText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean),
  );

  const addManualNote = async (excerpt?: string) => {
    const text = (excerpt ?? manualNote).trim();
    if (!text) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/episodes/${episodeId}/domains/${domain.domainId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ excerpt: text }),
      });
      const data = await parseApiResponse<{ domain?: DomainDetail; error?: string }>(res);
      if (!res.ok || !data.domain) throw new Error(data.error ?? "Failed");
      setDomain(data.domain);
      if (!excerpt) setManualNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const addManualQuestion = () => {
    const text = newQuestion.trim();
    if (!text) return;
    patchQuestions([...domain.clinicalQuestionPrompts, createQuestionPrompt(text)]);
    setNewQuestion("");
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
        return;
      }
      const num = Number(e.key);
      if (num >= 1 && num <= 5 && stage === "understand") {
        e.preventDefault();
        scrollToSection(UNDERSTAND_SECTIONS[num - 1]!.id);
        return;
      }
      const key = e.key.toLowerCase();
      if (key === "g") {
        e.preventDefault();
        void generateSynthesis();
      } else if (key === "q") {
        e.preventDefault();
        void generateQuestions(false);
      } else if (key === "d") {
        e.preventDefault();
        void generateDifferentials();
      } else if (key === "c" && stage === "report") {
        e.preventDefault();
        copySynthesisToReport();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    copySynthesisToReport,
    generateDifferentials,
    generateQuestions,
    generateSynthesis,
    scrollToSection,
    stage,
  ]);

  useEffect(() => {
    if (!shortcutsOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (shortcutsRef.current?.contains(e.target as Node)) return;
      setShortcutsOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [shortcutsOpen]);

  return (
    <div className="assessment-root">
      <div className="assessment-shell assessment-shell--wide">
        <header className="assessment-header">
          <div className="dm-header-row">
            <div>
              <p className="assessment-subtitle" style={{ marginBottom: "0.35rem" }}>
                <Link href={`/cases/${episodeId}/domains`}>Domain review</Link>
                {" · "}
                <Link href={`/cases/${episodeId}/assessment`}>Finding review</Link>
              </p>
              <h1 className="assessment-title">Clinical Synthesis</h1>
              <p className="assessment-subtitle">
                Evidence → synthesis → formulation → report. You remain responsible for
                interpretation.
              </p>
            </div>
            <div className="dm-header-actions">
              <div className="dm-shortcuts-wrap" ref={shortcutsRef}>
                <button
                  type="button"
                  className="dm-btn"
                  onClick={() => setShortcutsOpen((v) => !v)}
                  aria-expanded={shortcutsOpen}
                >
                  Shortcuts ?
                </button>
                {shortcutsOpen && (
                  <div className="dm-shortcuts-popover" aria-label="Keyboard shortcuts">
                    <p className="dm-shortcuts-title">Keyboard shortcuts</p>
                    <ul className="dm-shortcuts-list">
                      {SHORTCUTS.map((row) => (
                        <li key={row.action} className="dm-shortcuts-row">
                          <span className="dm-shortcuts-keys">{row.keys.join(" · ")}</span>
                          <span>{row.action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <Link href={`/cases/${episodeId}/domains`} className="dm-btn">
                All domains
              </Link>
              {!domain.reviewedAt ? (
                <button
                  type="button"
                  className="dm-btn dm-btn--primary"
                  onClick={() => void patch({ reviewed: true })}
                  disabled={saving}
                >
                  Mark reviewed
                </button>
              ) : (
                <button
                  type="button"
                  className="dm-btn"
                  onClick={() => void patch({ reviewed: false })}
                  disabled={saving}
                >
                  Unmark reviewed
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="dm-wrap">
          {error && <div className="assessment-alert">{error}</div>}

          <nav className="dm-stage-tabs" aria-label="Workflow stages">
            {STAGES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`dm-stage-tab${stage === s.id ? " dm-stage-tab--active" : ""}`}
                onClick={() => setStage(s.id)}
              >
                {s.label}
              </button>
            ))}
          </nav>

          {stage === "understand" && (
            <nav className="dm-jump-nav" aria-label="Section navigation">
              <span className="dm-jump-domain">{domain.label}</span>
              {coverage.expected > 0 && (
                <span className="dm-jump-stat">
                  Coverage {coverage.percent}% ({coverage.present}/{coverage.expected})
                </span>
              )}
              {UNDERSTAND_SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="dm-jump-btn"
                  onClick={() => scrollToSection(s.id)}
                >
                  {s.num}. {s.label}
                </button>
              ))}
            </nav>
          )}

          <div className="dm-workspace-layout">
            <div className="dm-reasoning-column">
              {stage === "understand" && (
                <>
              <SupportingEvidencePanel
                domainId={domain.domainId}
                confirmedFindingCount={domain.confirmedFindingCount}
                evidenceCount={domain.evidenceCount}
                sourceTypes={domain.sourceTypes}
                evidenceBuckets={domain.evidenceBuckets}
              />

              <section id="section-patterns" className="dm-panel dm-section dm-panel--hero">
                <p className="dm-section-step">Understanding</p>
                <div className="dm-panel-head">
                  <h2 className="dm-panel-title dm-panel-title--lg">Clinical synthesis</h2>
                  <span className="dm-ai-badge">AI draft</span>
                </div>
                <textarea
                  id="clinical-synthesis"
                  className="assessment-report-editor dm-synthesis-editor"
                  value={domain.evidenceSummaryDraft ?? ""}
                  onChange={(e) => {
                    setDomain((d) => ({ ...d, evidenceSummaryDraft: e.target.value }));
                    debouncedPatch({ evidenceSummaryDraft: e.target.value || null });
                  }}
                  placeholder="Synthesize themes, functional impact, and strengths…"
                />
                <div className="dm-actions">
                  <button
                    type="button"
                    className="dm-btn dm-btn--primary"
                    onClick={generateSynthesis}
                    disabled={generatingSynthesis || saving}
                  >
                    {generatingSynthesis ? "Generating…" : "Generate clinical synthesis"}
                  </button>
                </div>
              </section>

              <section id="section-opportunities" className="dm-panel dm-section dm-panel--compact">
                <p className="dm-section-step">Information still needed</p>
                <h2 className="dm-panel-title">Assessment opportunities</h2>
                {domain.assessmentOpportunityGroups.length > 0 ? (
                  <div className="dm-hint-callouts">
                    {domain.assessmentOpportunityGroups.map((group) =>
                      group.items.map((item) => (
                        <div key={`${group.category}-${item}`} className="dm-hint-callout">
                          <p className="dm-hint-callout-label">{group.label}</p>
                          <p className="dm-hint-callout-text">&ldquo;{item}&rdquo;</p>
                        </div>
                      )),
                    )}
                  </div>
                ) : (
                  <p className="dm-panel-hint dm-panel-hint--tight">
                    No additional opportunities identified at this time.
                  </p>
                )}
                <details className="dm-inline-details">
                  <summary>Clinician notes on opportunities</summary>
                  <textarea
                    id="opportunity-notes"
                    className="assessment-notes dm-inline-textarea"
                    value={domain.evidenceGapNotes ?? ""}
                    onChange={(e) => {
                      setDomain((d) => ({ ...d, evidenceGapNotes: e.target.value }));
                      debouncedPatch({ evidenceGapNotes: e.target.value || null });
                    }}
                  />
                </details>
                <details className="dm-inline-details">
                  <summary>Add evidence note</summary>
                  <textarea
                    id="manual-note"
                    className="assessment-notes dm-inline-textarea"
                    value={manualNote}
                    onChange={(e) => setManualNote(e.target.value)}
                    placeholder="Context not captured in a module…"
                  />
                  <div className="dm-actions dm-actions--tight">
                    <button
                      type="button"
                      className="dm-btn"
                      onClick={() => addManualNote()}
                      disabled={saving || !manualNote.trim()}
                    >
                      Save note
                    </button>
                  </div>
                </details>
              </section>

              <section id="section-questions" className="dm-panel dm-section dm-panel--compact">
                <p className="dm-section-step">Questions</p>
                <h2 className="dm-panel-title">Suggested clinical questions</h2>
                <div className="dm-actions dm-actions--tight dm-actions--inline">
                  <button
                    type="button"
                    className="dm-btn"
                    onClick={() => generateQuestions(false)}
                    disabled={generatingQuestions || saving}
                  >
                    {generatingQuestions ? "Generating…" : "Generate questions"}
                  </button>
                  <button
                    type="button"
                    className="dm-btn dm-btn--ghost"
                    onClick={() => generateQuestions(true)}
                    disabled={generatingQuestions || saving}
                    title="Replace all questions including edited and marked-asked"
                  >
                    Replace all
                  </button>
                </div>

                <ClinicalQuestionCards
                  prompts={domain.clinicalQuestionPrompts}
                  saving={saving}
                  onChange={patchQuestions}
                />

                <div className="dm-inline-add">
                  <textarea
                    id="new-question"
                    className="assessment-notes dm-inline-textarea"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="Add your own question…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        addManualQuestion();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="dm-text-btn"
                    onClick={addManualQuestion}
                    disabled={saving || !newQuestion.trim()}
                  >
                    Add to list
                  </button>
                </div>
              </section>

              <section id="section-differentials" className="dm-panel dm-section dm-panel--compact">
                <p className="dm-section-step">Alternative explanations</p>
                <h2 className="dm-panel-title">Other explanatory factors</h2>
                <p className="dm-panel-hint dm-panel-hint--tight">
                  Reasoning prompts — not diagnoses. Select suggestions or write your own.
                </p>

                <DifferentialPromptList
                  prompts={differentialPrompts}
                  selected={selectedAlternatives}
                  saving={saving}
                  onToggle={toggleAlternative}
                  onDismissAll={() => setDifferentialPrompts([])}
                />

                <textarea
                  id="alt-exp"
                  className="assessment-notes dm-alt-notes"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  onBlur={commitAlternatives}
                  placeholder="Your explanatory factors…"
                />

                <div className="dm-actions dm-actions--tight">
                  <button
                    type="button"
                    className="dm-btn"
                    onClick={generateDifferentials}
                    disabled={generatingDifferentials || saving}
                  >
                    {generatingDifferentials ? "Generating…" : "Generate differential prompts"}
                  </button>
                </div>
              </section>
                </>
              )}

              {stage === "formulate" && (
                <FormulationWorkspace
                  domain={domain}
                  saving={saving}
                  onFormulationChange={patchFormulation}
                  onGoToUnderstand={() => {
                    setStage("understand");
                    scrollToSection("section-patterns");
                  }}
                />
              )}

              {stage === "report" && (
                <ReportStage
                  summaryDraft={domain.summaryDraft}
                  evidenceSummaryDraft={domain.evidenceSummaryDraft}
                  clinicalFormulation={domain.clinicalFormulation}
                  saving={saving}
                  onSummaryChange={(value) => {
                    setDomain((d) => ({ ...d, summaryDraft: value || null }));
                    debouncedPatch({ summaryDraft: value || null });
                  }}
                  onCopySynthesisToReport={copySynthesisToReport}
                  onCopyFormulationSectionToReport={copyFormulationSectionToReport}
                />
              )}
            </div>

            <DomainStatusSidebar
              episodeId={episodeId}
              domain={domain}
              allDomains={allDomains}
              saving={saving}
              onPatch={(body) => void patch(body)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
