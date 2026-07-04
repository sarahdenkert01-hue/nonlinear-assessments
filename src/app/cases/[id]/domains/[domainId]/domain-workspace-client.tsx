"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "@/lib/hooks/useDebouncedCallback";
import { parseApiResponse } from "@/lib/parse-api-response";
import { computeEvidenceCoverage, sourceTypeLabel } from "@/lib/domains";
import type { Confidence } from "@/lib/findings/types";
import type { DomainDetail } from "@/lib/domains/types";
import "@/features/assessments/components/assessment.css";
import "../domains.css";

const CONFIDENCE_LEVELS: { value: Confidence | null; label: string }[] = [
  { value: null, label: "—" },
  { value: "LOW", label: "Low" },
  { value: "MODERATE", label: "Moderate" },
  { value: "HIGH", label: "High" },
];

const SECTIONS = [
  { id: "section-know", num: "1", label: "Know" },
  { id: "section-patterns", num: "2", label: "Patterns" },
  { id: "section-opportunities", num: "3", label: "Opportunities" },
  { id: "section-questions", num: "4", label: "Questions" },
  { id: "section-differentials", num: "5", label: "Else" },
  { id: "section-report", num: "6", label: "Report" },
] as const;

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
}: {
  episodeId: string;
  initialDomain: DomainDetail;
}) {
  const [domain, setDomain] = useState(initialDomain);
  const [altText, setAltText] = useState(initialDomain.alternativeExplanations.join("\n"));
  const [differentialDraft, setDifferentialDraft] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatingSynthesis, setGeneratingSynthesis] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [generatingDifferentials, setGeneratingDifferentials] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
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

  const generateQuestions = useCallback(async () => {
    setGeneratingQuestions(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/episodes/${episodeId}/domains/${domain.domainId}/suggested-questions`,
        { method: "POST" },
      );
      const data = await parseApiResponse<{ domain?: DomainDetail; error?: string }>(res);
      if (!res.ok || !data.domain) throw new Error(data.error ?? "Generation failed");
      setDomain(data.domain);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGeneratingQuestions(false);
    }
  }, [episodeId, domain.domainId]);

  const generateDifferentials = useCallback(async () => {
    setGeneratingDifferentials(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/episodes/${episodeId}/domains/${domain.domainId}/differential-prompts`,
        { method: "POST" },
      );
      const data = await parseApiResponse<{
        draft?: string;
        error?: string;
      }>(res);
      if (!res.ok || !data.draft) throw new Error(data.error ?? "Generation failed");
      setDifferentialDraft(data.draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGeneratingDifferentials(false);
    }
  }, [episodeId, domain.domainId]);

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
    const next = merged.join("\n");
    setAltText(next);
    void patch({ alternativeExplanations: merged });
  }, [altText, differentialDraft, patch]);

  const addManualNote = async () => {
    if (!manualNote.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/episodes/${episodeId}/domains/${domain.domainId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ excerpt: manualNote.trim() }),
      });
      const data = await parseApiResponse<{ domain?: DomainDetail; error?: string }>(res);
      if (!res.ok || !data.domain) throw new Error(data.error ?? "Failed");
      setDomain(data.domain);
      setManualNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
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
      if (num >= 1 && num <= 6) {
        e.preventDefault();
        scrollToSection(SECTIONS[num - 1]!.id);
        return;
      }

      const key = e.key.toLowerCase();
      if (key === "g") {
        e.preventDefault();
        void generateSynthesis();
      } else if (key === "q") {
        e.preventDefault();
        void generateQuestions();
      } else if (key === "d") {
        e.preventDefault();
        void generateDifferentials();
      } else if (key === "c") {
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
                Six questions to support your reasoning — you remain responsible for interpretation.
              </p>
            </div>
            <div className="dm-header-actions">
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
                <span className="dm-badge dm-badge--reviewed">
                  Reviewed {new Date(domain.reviewedAt).toLocaleDateString()}
                </span>
              )}
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
                ← Domains
              </Link>
            </div>
          </div>
        </header>

        <div className="dm-wrap">
          {error && <div className="assessment-alert">{error}</div>}

          <nav className="dm-jump-nav" aria-label="Section navigation">
            <span className="dm-jump-domain">{domain.label}</span>
            <span className="dm-jump-stat">
              {domain.confirmedFindingCount} finding
              {domain.confirmedFindingCount === 1 ? "" : "s"}
            </span>
            {coverage.expected > 0 && (
              <span className="dm-jump-stat">
                Coverage {coverage.percent}% ({coverage.present}/{coverage.expected})
              </span>
            )}
            {SECTIONS.map((s) => (
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

          <div className="dm-workspace-layout">
            <div className="dm-reasoning-column">
              {/* §1 What do we know? */}
              <section id="section-know" className="dm-panel dm-section">
                <p className="dm-question-label">1. What do we know?</p>
                <h2 className="dm-panel-title">Confirmed evidence</h2>
                <p className="dm-panel-hint">
                  Descriptive inventory only — no interpretation yet.
                </p>

                <div className="dm-know-stats">
                  <div className="dm-know-stat">
                    <span className="dm-know-stat-value">{domain.confirmedFindingCount}</span>
                    <span className="dm-know-stat-label">Confirmed findings</span>
                  </div>
                  <div className="dm-know-stat">
                    <span className="dm-know-stat-value">{domain.evidenceCount}</span>
                    <span className="dm-know-stat-label">Evidence items</span>
                  </div>
                  {coverage.expected > 0 && (
                    <div className="dm-know-stat">
                      <span className="dm-know-stat-value">{coverage.percent}%</span>
                      <span className="dm-know-stat-label">Source coverage</span>
                    </div>
                  )}
                </div>

                <div className="dm-row-meta" style={{ marginBottom: "0.85rem" }}>
                  {domain.sourceTypes.length === 0 ? (
                    <span className="dm-badge">No sources yet</span>
                  ) : (
                    domain.sourceTypes.map((s) => (
                      <span key={s} className="dm-badge">
                        {sourceTypeLabel(s)}
                      </span>
                    ))
                  )}
                </div>

                {domain.findings.length === 0 ? (
                  <p className="dm-panel-hint" style={{ marginBottom: "0.75rem" }}>
                    No confirmed findings linked. Confirm in finding review first.
                  </p>
                ) : (
                  <div className="dm-finding-list">
                    {domain.findings.map((f) => (
                      <details key={f.id} className="dm-finding-expand">
                        <summary className="dm-finding-expand-summary">
                          <span className="dm-finding-label">{f.label}</span>
                          <span className="dm-finding-meta">
                            {f.hits}/{f.total} indicators · {f.evidenceCount} item
                            {f.evidenceCount === 1 ? "" : "s"}
                          </span>
                        </summary>
                        {f.evidence.length === 0 ? (
                          <p className="dm-panel-hint" style={{ margin: "0.5rem 0.85rem 0.75rem" }}>
                            No item-level evidence.
                          </p>
                        ) : (
                          <ul className="dm-evidence-items">
                            {f.evidence.map((e) => (
                              <li key={e.id} className="dm-evidence-item">
                                <div className="dm-evidence-q">{e.text}</div>
                                <div className="dm-evidence-a">{e.answer || "—"}</div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </details>
                    ))}
                  </div>
                )}

                <label className="dm-field-label">Clinician confidence</label>
                <div className="dm-conf" role="group" aria-label="Clinician confidence">
                  {CONFIDENCE_LEVELS.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      className={`dm-conf-btn${domain.confidence === opt.value ? " dm-conf-btn--active" : ""}`}
                      onClick={() => void patch({ confidence: opt.value })}
                      disabled={saving}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </section>

              {/* §2 What patterns are emerging? */}
              <section id="section-patterns" className="dm-panel dm-section">
                <p className="dm-question-label">2. What patterns are emerging?</p>
                <div className="dm-panel-head">
                  <h2 className="dm-panel-title">Clinical synthesis</h2>
                  <span className="dm-ai-badge">AI Draft — Review and edit before using.</span>
                </div>
                <p className="dm-panel-hint">
                  AI-assisted synthesis of themes, functional impact, and strengths. Does not
                  populate your report automatically.
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

              {/* §3 What don't we know yet? */}
              <section id="section-opportunities" className="dm-panel dm-section">
                <p className="dm-question-label">3. What don&apos;t we know yet?</p>
                <h2 className="dm-panel-title">Assessment opportunities</h2>
                <p className="dm-panel-hint">
                  Opportunities to strengthen understanding — not deficiencies.
                </p>
                {domain.suggestedGaps.length > 0 ? (
                  <ul className="dm-opportunity-list">
                    {domain.suggestedGaps.map((g) => (
                      <li key={g}>{g}</li>
                    ))}
                  </ul>
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
                      onClick={addManualNote}
                      disabled={saving || !manualNote.trim()}
                    >
                      Add note
                    </button>
                  </div>
                </div>
              </section>

              {/* §4 What should I ask next? */}
              <section id="section-questions" className="dm-panel dm-section">
                <p className="dm-question-label">4. What should I ask next?</p>
                <h2 className="dm-panel-title">Suggested clinical questions</h2>
                <p className="dm-panel-hint">
                  Interview prompts to deepen understanding. Not diagnostic — ignore any that are
                  not useful.
                </p>
                <textarea
                  id="suggested-questions"
                  className="assessment-notes"
                  style={{ minHeight: "7rem" }}
                  value={domain.suggestedQuestionsDraft ?? ""}
                  onChange={(e) => {
                    setDomain((d) => ({ ...d, suggestedQuestionsDraft: e.target.value }));
                    debouncedPatch({ suggestedQuestionsDraft: e.target.value || null });
                  }}
                  placeholder="Generate or write interview prompts…"
                />
                <div className="dm-actions">
                  <button
                    type="button"
                    className="dm-btn dm-btn--primary"
                    onClick={generateQuestions}
                    disabled={generatingQuestions || saving}
                  >
                    {generatingQuestions ? "Generating…" : "Generate suggested questions"}
                  </button>
                </div>
              </section>

              {/* §5 What else could explain this? */}
              <section id="section-differentials" className="dm-panel dm-section">
                <p className="dm-question-label">5. What else could explain this?</p>
                <h2 className="dm-panel-title">Differential considerations</h2>
                <p className="dm-panel-hint">
                  Alternative explanations you are weighing — clinician-owned.
                </p>
                <textarea
                  id="alt-exp"
                  className="assessment-notes"
                  style={{ minHeight: "4.5rem" }}
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  onBlur={commitAlternatives}
                  placeholder="One consideration per line…"
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
                      aria-label="Ephemeral differential prompts"
                    />
                    <div className="dm-actions">
                      <button
                        type="button"
                        className="dm-btn"
                        onClick={copyDifferentialDraftToList}
                        disabled={saving || !differentialDraft.trim()}
                      >
                        Copy to differential list
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

              <details className="dm-collapsed dm-private-notes">
                <summary>Private clinician notes</summary>
                <div style={{ padding: "0 1rem 1rem" }}>
                  <p className="dm-panel-hint">
                    Not included in synthesis or report. For your working notes only.
                  </p>
                  <textarea
                    id="clinical-notes"
                    className="assessment-notes"
                    style={{ minHeight: "4rem" }}
                    value={domain.clinicalNotes ?? ""}
                    onChange={(e) => {
                      setDomain((d) => ({ ...d, clinicalNotes: e.target.value }));
                      debouncedPatch({ clinicalNotes: e.target.value || null });
                    }}
                  />
                </div>
              </details>
            </div>

            {/* §6 What belongs in my report? */}
            <aside id="section-report" className="dm-report-column">
              <section className="dm-panel dm-section dm-report-panel">
                <p className="dm-question-label">6. What belongs in my report?</p>
                <h2 className="dm-panel-title">Report draft</h2>
                <p className="dm-panel-hint">
                  Clinician-owned report language. Never overwritten automatically.
                </p>
                <textarea
                  id="summary-draft"
                  className="assessment-report-editor"
                  style={{ minHeight: "10rem" }}
                  value={domain.summaryDraft ?? ""}
                  onChange={(e) => {
                    setDomain((d) => ({ ...d, summaryDraft: e.target.value }));
                    debouncedPatch({ summaryDraft: e.target.value || null });
                  }}
                  placeholder="Editable domain summary for the report…"
                />
                <div className="dm-actions">
                  <button
                    type="button"
                    className="dm-btn dm-btn--primary"
                    onClick={copySynthesisToReport}
                    disabled={saving || !domain.evidenceSummaryDraft?.trim()}
                  >
                    Copy clinical synthesis → report draft
                  </button>
                </div>
                {domain.summaryDraft?.trim() ? (
                  <div className="dm-report-preview" aria-label="Report preview">
                    <div className="dm-report-preview-label">Preview</div>
                    <div className="dm-report-preview-body">{domain.summaryDraft}</div>
                  </div>
                ) : null}
              </section>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
