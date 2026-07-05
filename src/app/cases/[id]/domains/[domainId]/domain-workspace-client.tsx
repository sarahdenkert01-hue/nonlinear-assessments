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
  const [differentialDraft, setDifferentialDraft] = useState("");
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
      setDifferentialDraft(data.draft);
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

  const copyDifferentialDraftToList = useCallback(() => {
    const lines = differentialDraft
      .split("\n")
      .map((l) => l.replace(/^[\s•\-*]+/, "").trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    const existing = new Set(
      altText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
    );
    const merged = [...existing];
    for (const line of lines) {
      if (!existing.has(line)) merged.push(line);
    }
    setAltText(merged.join("\n"));
    void patch({ alternativeExplanations: merged });
  }, [altText, differentialDraft, patch]);

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

              <section id="section-patterns" className="dm-panel dm-section">
                <p className="dm-question-label">2. What pattern is emerging?</p>
                <div className="dm-panel-head">
                  <h2 className="dm-panel-title">Clinical synthesis</h2>
                  <span className="dm-ai-badge">AI Draft — Review and edit before using.</span>
                </div>
                <p className="dm-panel-hint">
                  AI-assisted synthesis of themes, functional impact, and strengths.
                </p>
                <textarea
                  id="clinical-synthesis"
                  className="assessment-report-editor"
                  style={{ minHeight: "8rem" }}
                  value={domain.evidenceSummaryDraft ?? ""}
                  onChange={(e) => {
                    setDomain((d) => ({ ...d, evidenceSummaryDraft: e.target.value }));
                    debouncedPatch({ evidenceSummaryDraft: e.target.value || null });
                  }}
                  placeholder="Generate or write clinical synthesis…"
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

              <section id="section-opportunities" className="dm-panel dm-section">
                <p className="dm-question-label">
                  3. What information would strengthen this formulation?
                </p>
                <h2 className="dm-panel-title">Assessment opportunities</h2>
                <p className="dm-panel-hint">
                  Areas where additional information may strengthen confidence in this formulation.
                </p>
                {domain.assessmentOpportunityGroups.length > 0 ? (
                  <div className="dm-opportunity-groups">
                    {domain.assessmentOpportunityGroups.map((group) => (
                      <div key={group.category} className="dm-opportunity-group">
                        <h3 className="dm-opportunity-group-title">{group.label}</h3>
                        <ul className="dm-opportunity-list">
                          {group.items.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="dm-panel-hint" style={{ marginBottom: "0.75rem" }}>
                    No additional opportunities identified at this time.
                  </p>
                )}
                <label className="dm-field-label" htmlFor="opportunity-notes">
                  Clinician notes on opportunities
                </label>
                <textarea
                  id="opportunity-notes"
                  className="assessment-notes"
                  style={{ marginTop: 0, minHeight: "3.5rem" }}
                  value={domain.evidenceGapNotes ?? ""}
                  onChange={(e) => {
                    setDomain((d) => ({ ...d, evidenceGapNotes: e.target.value }));
                    debouncedPatch({ evidenceGapNotes: e.target.value || null });
                  }}
                />
                <div className="dm-add-note">
                  <label className="dm-field-label" htmlFor="manual-note">
                    Add evidence note
                  </label>
                  <textarea
                    id="manual-note"
                    className="assessment-notes"
                    style={{ minHeight: "2.75rem" }}
                    value={manualNote}
                    onChange={(e) => setManualNote(e.target.value)}
                    placeholder="Context not captured in a module…"
                  />
                  <div className="dm-actions">
                    <button
                      type="button"
                      className="dm-btn"
                      onClick={() => addManualNote()}
                      disabled={saving || !manualNote.trim()}
                    >
                      Add note
                    </button>
                  </div>
                </div>
              </section>

              <section id="section-questions" className="dm-panel dm-section">
                <p className="dm-question-label">4. What should I ask next?</p>
                <h2 className="dm-panel-title">Suggested clinical questions</h2>
                <p className="dm-panel-hint">
                  Interview prompts to deepen understanding — not diagnostic. Ignore any that are
                  not useful.
                </p>

                <ClinicalQuestionCards
                  prompts={domain.clinicalQuestionPrompts}
                  saving={saving}
                  onChange={patchQuestions}
                  onAddToEvidence={addManualNote}
                />

                <div className="dm-add-question">
                  <label className="dm-field-label" htmlFor="new-question">
                    Add your own question
                  </label>
                  <textarea
                    id="new-question"
                    className="assessment-notes"
                    style={{ minHeight: "2.5rem" }}
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="Write a custom interview prompt…"
                  />
                  <div className="dm-actions">
                    <button
                      type="button"
                      className="dm-btn"
                      onClick={addManualQuestion}
                      disabled={saving || !newQuestion.trim()}
                    >
                      Add question
                    </button>
                    <button
                      type="button"
                      className="dm-btn dm-btn--primary"
                      onClick={() => generateQuestions(false)}
                      disabled={generatingQuestions || saving}
                    >
                      {generatingQuestions ? "Generating…" : "Generate suggested questions"}
                    </button>
                    <button
                      type="button"
                      className="dm-btn"
                      onClick={() => generateQuestions(true)}
                      disabled={generatingQuestions || saving}
                      title="Replace all questions including edited and marked-asked"
                    >
                      Replace all
                    </button>
                  </div>
                </div>
              </section>

              <section id="section-differentials" className="dm-panel dm-section">
                <p className="dm-question-label">5. What else could explain this?</p>
                <h2 className="dm-panel-title">Other explanatory factors</h2>
                <p className="dm-panel-hint">
                  Alternative explanations as clinical reasoning prompts — not diagnoses.
                </p>
                <textarea
                  id="alt-exp"
                  className="assessment-notes"
                  style={{ minHeight: "4.5rem" }}
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  onBlur={commitAlternatives}
                  placeholder={
                    "Could trauma contribute to this pattern?\nCould sleep disruption amplify this presentation?"
                  }
                />

                {differentialDraft && (
                  <div className="dm-ephemeral-panel">
                    <div className="dm-panel-head">
                      <span className="dm-ephemeral-label">Suggested prompts (not saved)</span>
                      <span className="dm-ai-badge">AI Draft</span>
                    </div>
                    <textarea
                      className="assessment-notes"
                      style={{ minHeight: "4rem" }}
                      value={differentialDraft}
                      onChange={(e) => setDifferentialDraft(e.target.value)}
                      aria-label="Ephemeral explanatory factor prompts"
                    />
                    <div className="dm-actions">
                      <button
                        type="button"
                        className="dm-btn"
                        onClick={copyDifferentialDraftToList}
                        disabled={saving || !differentialDraft.trim()}
                      >
                        Copy to explanatory factors
                      </button>
                      <button
                        type="button"
                        className="dm-btn"
                        onClick={() => setDifferentialDraft("")}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}

                <div className="dm-actions">
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
              stage={stage}
              saving={saving}
              onPatch={(body) => void patch(body)}
              onStageChange={setStage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
