"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReportPanel,
  THEMES,
  requestSessionReport,
  type AssessmentReportResult,
} from "@/features/assessments";
import { parseApiResponse } from "@/lib/parse-api-response";
import type {
  Confidence,
  FindingRecord,
  FindingStatus,
} from "@/lib/findings/types";
import "./findings-review.css";

interface FindingsReviewProps {
  sessionId: string;
  clientName?: string;
  initialFindings: FindingRecord[];
  clinicianNotes: string;
  onNotesChange: (notes: string) => void;
  reportDraft: string | null;
  reportGeneratedAt: string | null;
  reportFinalized: boolean;
  onReportDraftChange: (draft: string) => void;
  onReportGenerated: (report: AssessmentReportResult) => void;
  onFinalizeReport: () => void;
  onExportReport: () => void;
}

const CONFIDENCE_LEVELS: { value: Confidence | null; label: string; title: string }[] = [
  { value: null, label: "—", title: "Not set" },
  { value: "LOW", label: "Low", title: "Low confidence" },
  { value: "MODERATE", label: "Moderate", title: "Moderate confidence" },
  { value: "HIGH", label: "High", title: "High confidence" },
];

const SHORTCUTS = [
  { keys: ["↑", "↓"], action: "Move to previous / next finding" },
  { keys: ["C"], action: "Confirm active finding for report" },
  { keys: ["X"], action: "Exclude active finding" },
  { keys: ["1", "2", "3"], action: "Set confidence: Low / Moderate / High" },
  { keys: ["E"], action: "Expand or collapse evidence" },
  { keys: ["A"], action: "Expand or collapse alternative explanations" },
] as const;

function categoryBadgeClass(category: string | null): string {
  if (category === "ADHD") return "assessment-badge assessment-badge--adhd";
  if (category === "Autism") return "assessment-badge assessment-badge--autism";
  return "assessment-badge assessment-badge--both";
}

function isProposed(f: FindingRecord): boolean {
  return f.status === "PROPOSED";
}
function isIncluded(status: FindingStatus): boolean {
  return status !== "EXCLUDED";
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

type StatusMeta = { mod: "review" | "included" | "excluded"; label: string };
function statusMeta(status: FindingStatus): StatusMeta {
  if (status === "EXCLUDED") return { mod: "excluded", label: "Excluded" };
  if (status === "PROPOSED") return { mod: "review", label: "Awaiting decision" };
  return { mod: "included", label: "Included" };
}

function evidenceStrength(finding: FindingRecord): {
  level: 0 | 1 | 2 | 3;
  word: string;
  none: boolean;
} {
  if (finding.hits <= 0) return { level: 0, word: "Clinician judgment", none: true };
  const ratio = finding.total > 0 ? finding.hits / finding.total : 1;
  if (ratio >= 0.667) return { level: 3, word: "Strong", none: false };
  if (ratio >= 0.334) return { level: 2, word: "Moderate", none: false };
  return { level: 1, word: "Limited", none: false };
}

function orderFindings(list: FindingRecord[]): FindingRecord[] {
  const rank = (f: FindingRecord) =>
    f.status === "PROPOSED" ? 0 : f.status === "EXCLUDED" ? 2 : 1;
  const strengthRatio = (f: FindingRecord) =>
    f.total > 0 ? f.hits / f.total : f.hits > 0 ? 1 : 0;
  return [...list].sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    if (strengthRatio(a) !== strengthRatio(b)) return strengthRatio(b) - strengthRatio(a);
    return a.label.localeCompare(b.label);
  });
}

export function FindingsReview({
  sessionId,
  clientName,
  initialFindings,
  clinicianNotes,
  onNotesChange,
  reportDraft,
  reportGeneratedAt,
  reportFinalized,
  onReportDraftChange,
  onReportGenerated,
  onFinalizeReport,
  onExportReport,
}: FindingsReviewProps) {
  const [findings, setFindings] = useState<FindingRecord[]>(() =>
    orderFindings(initialFindings),
  );
  const [notes, setNotes] = useState(clinicianNotes);
  const [addCode, setAddCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<"all" | "undecided">("all");
  const [showHelp, setShowHelp] = useState(false);
  const [expandedEvidence, setExpandedEvidence] = useState<Set<string>>(new Set());
  const [expandedAlt, setExpandedAlt] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(() => {
    const ordered = orderFindings(initialFindings);
    return (ordered.find(isProposed) ?? ordered[0])?.id ?? null;
  });

  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());
  const shortcutsBtnRef = useRef<HTMLButtonElement>(null);
  const shortcutsPopoverRef = useRef<HTMLDivElement>(null);

  const totalCount = findings.length;
  const needsReviewCount = findings.filter(isProposed).length;
  const includedCount = findings.filter((f) => isIncluded(f.status)).length;
  const excludedCount = findings.filter((f) => f.status === "EXCLUDED").length;
  const reviewedCount = totalCount - needsReviewCount;
  const progressPct =
    totalCount > 0 ? Math.round((reviewedCount / totalCount) * 100) : 0;

  const visible = useMemo(
    () => (filterMode === "undecided" ? findings.filter(isProposed) : findings),
    [findings, filterMode],
  );

  const addableThemes = useMemo(() => {
    const present = new Set(findings.map((f) => f.code));
    return THEMES.filter((t) => !present.has(t.id));
  }, [findings]);

  useEffect(() => {
    if (visible.length === 0) {
      if (focusedId !== null) setFocusedId(null);
      return;
    }
    if (!focusedId || !visible.some((f) => f.id === focusedId)) {
      setFocusedId(visible[0].id);
    }
  }, [visible, focusedId]);

  useEffect(() => {
    if (!focusedId) return;
    cardRefs.current.get(focusedId)?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [focusedId]);

  useEffect(() => {
    if (!showHelp) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        shortcutsPopoverRef.current?.contains(target) ||
        shortcutsBtnRef.current?.contains(target)
      ) {
        return;
      }
      setShowHelp(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowHelp(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [showHelp]);

  const runPatch = useCallback(
    async (
      id: string,
      patch: {
        status?: FindingStatus;
        confidence?: Confidence | null;
        alternativeExplanations?: string[];
      },
    ) => {
      let snapshot: FindingRecord | undefined;
      setFindings((prev) => {
        snapshot = prev.find((f) => f.id === id);
        return prev.map((f) => (f.id === id ? { ...f, ...patch } : f));
      });
      setError(null);
      try {
        const res = await fetch(`/api/episodes/${sessionId}/findings`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ findingId: id, ...patch }),
        });
        const data = await parseApiResponse<{
          finding?: FindingRecord;
          error?: string;
        }>(res);
        if (!res.ok || !data.finding) throw new Error(data.error ?? "Update failed");
        setFindings((prev) => prev.map((f) => (f.id === id ? data.finding! : f)));
      } catch (err) {
        if (snapshot) {
          const restore = snapshot;
          setFindings((prev) => prev.map((f) => (f.id === id ? restore : f)));
        }
        setError(err instanceof Error ? err.message : "Update failed");
      }
    },
    [sessionId],
  );

  const advanceAfter = useCallback(
    (id: string) => {
      const idx = visible.findIndex((f) => f.id === id);
      if (idx === -1) return;
      const rest = visible.slice(idx + 1);
      const next =
        rest.find(isProposed) ?? rest[0] ?? visible[idx - 1] ?? null;
      setFocusedId(next ? next.id : null);
    },
    [visible],
  );

  const decide = useCallback(
    (id: string, status: FindingStatus) => {
      if (reportFinalized) return;
      advanceAfter(id);
      void runPatch(id, { status });
    },
    [advanceAfter, runPatch, reportFinalized],
  );

  const setConfidenceFor = useCallback(
    (id: string, confidence: Confidence) => {
      if (reportFinalized) return;
      void runPatch(id, { confidence });
    },
    [runPatch, reportFinalized],
  );

  const moveFocus = useCallback(
    (delta: number) => {
      if (visible.length === 0) return;
      const idx = focusedId ? visible.findIndex((f) => f.id === focusedId) : -1;
      const nextIdx =
        idx === -1
          ? 0
          : Math.min(visible.length - 1, Math.max(0, idx + delta));
      setFocusedId(visible[nextIdx].id);
    },
    [visible, focusedId],
  );

  const toggleEvidence = useCallback((id: string) => {
    setExpandedEvidence((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAlternatives = useCallback((id: string) => {
    setExpandedAlt((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setEvidenceOpen = useCallback((id: string, open: boolean) => {
    setExpandedEvidence((prev) => {
      if (open === prev.has(id)) return prev;
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const setAlternativesOpen = useCallback((id: string, open: boolean) => {
    setExpandedAlt((prev) => {
      if (open === prev.has(id)) return prev;
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case "ArrowDown":
          moveFocus(1);
          break;
        case "ArrowUp":
          moveFocus(-1);
          break;
        case "c":
        case "C":
          if (focusedId) decide(focusedId, "ACCEPTED");
          break;
        case "x":
        case "X":
          if (focusedId) decide(focusedId, "EXCLUDED");
          break;
        case "e":
        case "E":
          if (focusedId) toggleEvidence(focusedId);
          break;
        case "a":
        case "A":
          if (focusedId) toggleAlternatives(focusedId);
          break;
        case "1":
          if (focusedId) setConfidenceFor(focusedId, "LOW");
          break;
        case "2":
          if (focusedId) setConfidenceFor(focusedId, "MODERATE");
          break;
        case "3":
          if (focusedId) setConfidenceFor(focusedId, "HIGH");
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    focusedId,
    moveFocus,
    decide,
    toggleEvidence,
    toggleAlternatives,
    setConfidenceFor,
  ]);

  const handleAddFinding = async () => {
    if (!addCode) return;
    const theme = THEMES.find((t) => t.id === addCode);
    setError(null);
    try {
      const res = await fetch(`/api/episodes/${sessionId}/findings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: addCode,
          label: theme?.label ?? addCode,
          category: theme?.category,
        }),
      });
      const data = await parseApiResponse<{
        finding?: FindingRecord;
        error?: string;
      }>(res);
      if (!res.ok || !data.finding) throw new Error(data.error ?? "Add failed");
      setFindings((prev) => [...prev, data.finding as FindingRecord]);
      setAddCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add failed");
    }
  };

  const handleGenerate = ({ narrativeOnly }: { narrativeOnly: boolean }) =>
    requestSessionReport(sessionId, {
      overrides: {},
      clinicianNotes: notes.trim() || undefined,
      narrativeOnly,
    });

  return (
    <div className="assessment-root">
      <div className="assessment-shell assessment-shell--wide">
        <header className="assessment-header">
          <h1 className="assessment-title">Clinical findings</h1>
          <p className="assessment-subtitle">
            {clientName
              ? `Review the evidence for ${clientName}, then decide what belongs in the report. The tool proposes; you decide.`
              : "Review the evidence, then decide what belongs in the report. The tool proposes; you decide."}
          </p>
        </header>

        <div className="fr-wrap">
          {totalCount > 0 && (
            <div
              className="fr-toolbar"
              role="region"
              aria-label="Clinical review progress"
            >
              <div className="fr-toolbar-main">
                <div className="fr-toolbar-left">
                  <h2 className="fr-toolbar-title">Clinical review</h2>
                  <div className="fr-toolbar-stats">
                    <span>
                      <strong>{reviewedCount}</strong> of{" "}
                      <strong>{totalCount}</strong> reviewed
                    </span>
                    <span>
                      <strong>{needsReviewCount}</strong> remaining
                    </span>
                    <span>
                      <strong>{includedCount}</strong> included
                    </span>
                    <span>
                      <strong>{excludedCount}</strong> excluded
                    </span>
                  </div>
                  <div
                    className="fr-toolbar-track"
                    role="progressbar"
                    aria-valuenow={progressPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${reviewedCount} of ${totalCount} findings reviewed`}
                  >
                    <div
                      className="fr-toolbar-fill"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                <div className="fr-toolbar-right">
                  <button
                    type="button"
                    className={`fr-tool-btn${filterMode === "undecided" ? " fr-tool-btn--on" : ""}`}
                    onClick={() =>
                      setFilterMode((m) => (m === "all" ? "undecided" : "all"))
                    }
                    aria-pressed={filterMode === "undecided"}
                  >
                    Awaiting decision only
                  </button>

                  <div className="fr-shortcuts-anchor">
                    <button
                      ref={shortcutsBtnRef}
                      type="button"
                      className={`fr-tool-btn${showHelp ? " fr-tool-btn--on" : ""}`}
                      onClick={() => setShowHelp((s) => !s)}
                      aria-expanded={showHelp}
                      aria-haspopup="dialog"
                    >
                      Shortcuts
                    </button>

                    {showHelp && (
                      <div
                        ref={shortcutsPopoverRef}
                        className="fr-shortcuts-popover"
                        role="dialog"
                        aria-label="Keyboard shortcuts"
                      >
                        <p className="fr-shortcuts-title">Keyboard shortcuts</p>
                        <ul className="fr-shortcuts-list">
                          {SHORTCUTS.map((row) => (
                            <li key={row.action} className="fr-shortcuts-row">
                              <span className="fr-shortcuts-keys">
                                {row.keys.map((key) => (
                                  <kbd key={key} className="fr-key">
                                    {key}
                                  </kbd>
                                ))}
                              </span>
                              <span className="fr-shortcuts-action">{row.action}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="fr-shortcuts-note">
                          Shortcuts apply to the highlighted finding only. They are
                          disabled while typing in a field.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && <div className="assessment-alert">{error}</div>}

          {totalCount === 0 && (
            <div className="fr-empty">
              No findings were proposed from the responses. You can add clinically
              relevant findings manually below.
            </div>
          )}

          {totalCount > 0 && visible.length === 0 && (
            <div className="fr-empty">
              Nothing left to review — every finding has a decision.{" "}
              <button
                type="button"
                className="fr-btn fr-btn--ghost"
                style={{ marginLeft: "0.5rem" }}
                onClick={() => setFilterMode("all")}
              >
                Show all findings
              </button>
            </div>
          )}

          {visible.length > 0 && (
            <div className="fr-list" role="list" aria-label="Findings to review">
              {visible.map((finding) => (
                <FindingCard
                  key={finding.id}
                  finding={finding}
                  focused={focusedId === finding.id}
                  evidenceExpanded={expandedEvidence.has(finding.id)}
                  altExpanded={expandedAlt.has(finding.id)}
                  disabled={reportFinalized}
                  registerRef={(el) => {
                    if (el) cardRefs.current.set(finding.id, el);
                    else cardRefs.current.delete(finding.id);
                  }}
                  onFocusCard={() => setFocusedId(finding.id)}
                  onStatus={(status) => decide(finding.id, status)}
                  onConfidence={(confidence) => {
                    if (confidence) setConfidenceFor(finding.id, confidence);
                    else void runPatch(finding.id, { confidence: null });
                  }}
                  onToggleEvidence={() => toggleEvidence(finding.id)}
                  onToggleAlternatives={() => toggleAlternatives(finding.id)}
                  onEvidenceOpenChange={(open) => setEvidenceOpen(finding.id, open)}
                  onAlternativesOpenChange={(open) =>
                    setAlternativesOpen(finding.id, open)
                  }
                  onAlternatives={(alts) =>
                    runPatch(finding.id, { alternativeExplanations: alts })
                  }
                />
              ))}
            </div>
          )}

          {addableThemes.length > 0 && !reportFinalized && (
            <div className="fr-panel">
              <h3 className="fr-panel-title">Add a finding</h3>
              <p className="fr-panel-hint">
                Add a clinically relevant theme the tool did not flag. Any endorsed
                items for that theme are linked as evidence automatically.
              </p>
              <div className="fr-add-row">
                <select
                  value={addCode}
                  onChange={(e) => setAddCode(e.target.value)}
                  className="assessment-select"
                  style={{ maxWidth: "22rem" }}
                >
                  <option value="">Select a theme…</option>
                  {addableThemes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label} ({t.category})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="fr-btn fr-btn--ghost"
                  onClick={handleAddFinding}
                  disabled={!addCode}
                >
                  Add finding
                </button>
              </div>
            </div>
          )}

          <div className="fr-panel">
            <label htmlFor="clinician-notes" className="fr-panel-title">
              Clinician notes
            </label>
            <p className="fr-panel-hint">
              Overall clinical context or reasoning. Included in the report draft.
            </p>
            <textarea
              id="clinician-notes"
              className="assessment-notes"
              style={{ marginTop: 0 }}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                onNotesChange(e.target.value);
              }}
              placeholder="Clinical observations, context, or rationale for findings..."
            />
          </div>

          <ReportPanel
            canGenerate={includedCount > 0}
            sessionId={sessionId}
            initialReportDraft={reportDraft}
            reportGeneratedAt={reportGeneratedAt}
            reportFinalized={reportFinalized}
            onGenerate={handleGenerate}
            onReportDraftChange={onReportDraftChange}
            onReportGenerated={onReportGenerated}
            onFinalizeReport={onFinalizeReport}
            onExportReport={onExportReport}
          />
        </div>
      </div>
    </div>
  );
}

function FindingCard({
  finding,
  focused,
  evidenceExpanded,
  altExpanded,
  disabled,
  registerRef,
  onFocusCard,
  onStatus,
  onConfidence,
  onToggleEvidence,
  onToggleAlternatives,
  onEvidenceOpenChange,
  onAlternativesOpenChange,
  onAlternatives,
}: {
  finding: FindingRecord;
  focused: boolean;
  evidenceExpanded: boolean;
  altExpanded: boolean;
  disabled: boolean;
  registerRef: (el: HTMLElement | null) => void;
  onFocusCard: () => void;
  onStatus: (status: FindingStatus) => void;
  onConfidence: (confidence: Confidence | null) => void;
  onToggleEvidence: () => void;
  onToggleAlternatives: () => void;
  onEvidenceOpenChange: (open: boolean) => void;
  onAlternativesOpenChange: (open: boolean) => void;
  onAlternatives: (alternatives: string[]) => void;
}) {
  const [altText, setAltText] = useState(finding.alternativeExplanations.join("\n"));
  const strength = evidenceStrength(finding);
  const meta = statusMeta(finding.status);
  const evidenceCount = finding.evidence.length;
  const showStatusBadge = finding.status !== "PROPOSED";

  const commitAlternatives = () => {
    const next = altText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (next.join("\n") === finding.alternativeExplanations.join("\n")) return;
    onAlternatives(next);
  };

  return (
    <article
      ref={registerRef}
      id={`finding-${finding.id}`}
      role="listitem"
      aria-current={focused ? "true" : undefined}
      tabIndex={focused ? 0 : -1}
      className={`fr-card fr-card--${meta.mod}${focused ? " fr-card--focused" : ""}`}
      onMouseDown={onFocusCard}
    >
      <div className="fr-card-head">
        <div className="fr-card-titlewrap">
          <div className="fr-card-tags">
            <span className={categoryBadgeClass(finding.category)}>
              {finding.category ?? "General"}
            </span>
            {finding.source === "CLINICIAN" && (
              <span className="fr-source">Clinician-added</span>
            )}
          </div>
          <h3 className="fr-card-label">{finding.label}</h3>
        </div>
        {showStatusBadge && (
          <span className={`fr-status fr-status--${meta.mod}`}>{meta.label}</span>
        )}
      </div>

      <div className="fr-metrics">
        <div>
          <div className="fr-metric-label">Evidence strength</div>
          <div className={`fr-strength${strength.none ? " fr-strength--none" : ""}`}>
            {!strength.none && (
              <span className="fr-meter" aria-hidden>
                {[1, 2, 3].map((seg) => (
                  <span
                    key={seg}
                    className={`fr-meter-seg${seg <= strength.level ? " fr-meter-seg--on" : ""}`}
                  />
                ))}
              </span>
            )}
            <span className="fr-strength-word">{strength.word}</span>
          </div>
          <div className="fr-metric-hint">
            {finding.total > 0
              ? `${finding.hits} of ${finding.total} indicators endorsed`
              : "Based on your clinical judgment"}
          </div>
        </div>

        <div>
          <div className="fr-metric-label">Clinical confidence</div>
          <div className="fr-conf" role="group" aria-label="Clinical confidence">
            {CONFIDENCE_LEVELS.map((opt) => (
              <button
                key={opt.title}
                type="button"
                title={opt.title}
                className={`fr-conf-btn${finding.confidence === opt.value ? " fr-conf-btn--active" : ""}`}
                onClick={() => onConfidence(opt.value)}
                disabled={disabled}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="fr-metric-hint">Your judgment — not set by the tool</div>
        </div>
      </div>

      <details
        className="fr-disclosure"
        open={evidenceExpanded}
        onToggle={(e) => onEvidenceOpenChange(e.currentTarget.open)}
      >
        <summary
          onClick={(e) => {
            e.preventDefault();
            onToggleEvidence();
          }}
        >
          Review evidence{" "}
          <span className="fr-disclosure-meta">
            · {evidenceCount} endorsed item{evidenceCount === 1 ? "" : "s"}
          </span>
          <span className="fr-disclosure-key" aria-hidden>
            E
          </span>
        </summary>
        <div className="fr-evidence-body">
          {evidenceCount === 0 ? (
            <p className="fr-evidence-empty">
              No endorsed items are linked to this finding. It rests on your clinical
              judgment.
            </p>
          ) : (
            finding.evidence.map((item) => (
              <div key={item.id} className="fr-evidence-item">
                <div className="fr-evidence-q">{item.text}</div>
                <div className="fr-evidence-a">
                  Client responded
                  <span className="fr-answer-chip">{item.answer || "—"}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </details>

      <details
        className="fr-disclosure"
        open={altExpanded}
        onToggle={(e) => onAlternativesOpenChange(e.currentTarget.open)}
      >
        <summary
          onClick={(e) => {
            e.preventDefault();
            onToggleAlternatives();
          }}
        >
          Alternative explanations
          {finding.alternativeExplanations.length > 0 && (
            <span className="fr-disclosure-meta">
              · {finding.alternativeExplanations.length} noted
            </span>
          )}
          <span className="fr-disclosure-key" aria-hidden>
            A
          </span>
        </summary>
        <div className="fr-alt-body">
          <textarea
            className="assessment-notes"
            style={{ minHeight: "4.5rem" }}
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            onBlur={commitAlternatives}
            placeholder="Differentials or other explanations to consider — one per line (e.g. anxiety, trauma, sensory environment)…"
            disabled={disabled}
          />
        </div>
      </details>

      <div className="fr-actions">
        {finding.status === "EXCLUDED" ? (
          <>
            <span className="fr-decision-prompt">Excluded from the report.</span>
            <button
              type="button"
              className="fr-btn fr-btn--ghost"
              onClick={() => onStatus("ACCEPTED")}
              disabled={disabled}
            >
              Restore
            </button>
          </>
        ) : finding.status === "PROPOSED" ? (
          <>
            <span className="fr-decision-prompt">
              Proposed by the tool — confirm or exclude.
            </span>
            <button
              type="button"
              className="fr-btn fr-btn--exclude"
              onClick={() => onStatus("EXCLUDED")}
              disabled={disabled}
            >
              Exclude <span className="fr-key-hint" aria-hidden>(X)</span>
            </button>
            <button
              type="button"
              className="fr-btn fr-btn--confirm"
              onClick={() => onStatus("ACCEPTED")}
              disabled={disabled}
            >
              Confirm <span className="fr-key-hint" aria-hidden>(C)</span>
            </button>
          </>
        ) : (
          <>
            <span className="fr-included-flag">
              <span aria-hidden>✓</span> Included in report
            </span>
            <button
              type="button"
              className="fr-btn fr-btn--exclude"
              onClick={() => onStatus("EXCLUDED")}
              disabled={disabled}
            >
              Exclude <span className="fr-key-hint" aria-hidden>(X)</span>
            </button>
          </>
        )}
      </div>
    </article>
  );
}
