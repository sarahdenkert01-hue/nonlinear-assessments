"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "@/lib/hooks/useDebouncedCallback";
import { useFlushableDebouncedCallback } from "@/lib/hooks/useFlushableDebouncedCallback";
import { parseApiResponse } from "@/lib/parse-api-response";
import { computeEvidenceCoverage } from "@/lib/domains";
import {
  getManualNoteDraftExcerpt,
  isManualNoteDraft,
} from "@/lib/domains/manual-note";
import { flushBeforeNavigate } from "@/lib/domains/manual-note-nav";
import type { ClinicalFormulationDraft, ClinicalQuestionPrompt, DomainDetail, DomainSummary } from "@/lib/domains/types";
import { createQuestionPrompt } from "@/lib/domains/clinical-questions";
import "@/features/assessments/components/assessment.css";
import "../domains.css";
import { DomainStatusSidebar, type WorkspaceStage } from "./domain-status-sidebar";
import { FormulateStage } from "./formulate-stage";
import { ReportStage } from "./report-stage";
import { UnderstandStage } from "./understand-stage";

const STAGES: { id: WorkspaceStage; label: string; guidance: string }[] = [
  {
    id: "understand",
    label: "Understand",
    guidance: "Review linked findings and source material before interpreting.",
  },
  {
    id: "formulate",
    label: "Formulate",
    guidance: "Develop a coherent clinical understanding from the available evidence.",
  },
  {
    id: "report",
    label: "Report",
    guidance: "Translate your clinical reasoning into concise report language.",
  },
];

const SHORTCUTS = [
  { keys: ["G"], action: "Generate synthesis draft (Formulate)" },
  { keys: ["C"], action: "Copy synthesis (Report)" },
];

const MANUAL_NOTE_AUTOSAVE_MS = 700;

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
  const router = useRouter();
  const [domain, setDomain] = useState(initialDomain);
  const [altText, setAltText] = useState(initialDomain.alternativeExplanations.join("\n"));
  const [differentialPrompts, setDifferentialPrompts] = useState<string[]>([]);
  const [manualNote, setManualNote] = useState(() =>
    getManualNoteDraftExcerpt(initialDomain.evidence),
  );
  const [manualNoteDirty, setManualNoteDirty] = useState(false);
  const [noteStatus, setNoteStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [forceOpenRecordsNotes, setForceOpenRecordsNotes] = useState(() =>
    initialDomain.evidence.some((e) => e.sourceType === "MANUAL_NOTE"),
  );
  const [newQuestion, setNewQuestion] = useState("");
  const [reportLastEditedAt, setReportLastEditedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatingSynthesis, setGeneratingSynthesis] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [generatingDifferentials, setGeneratingDifferentials] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [stage, setStage] = useState<WorkspaceStage>("understand");
  const shortcutsRef = useRef<HTMLDivElement>(null);
  const manualNoteRef = useRef(manualNote);
  const dirtyRef = useRef(manualNoteDirty);
  const persistChainRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    manualNoteRef.current = manualNote;
  }, [manualNote]);
  useEffect(() => {
    dirtyRef.current = manualNoteDirty;
  }, [manualNoteDirty]);

  const coverage = computeEvidenceCoverage(domain.domainId, domain.sourceTypes);
  const activeStage = STAGES.find((s) => s.id === stage)!;

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
        if ("summaryDraft" in body) {
          setReportLastEditedAt(new Date().toISOString());
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      } finally {
        setSaving(false);
      }
    },
    [episodeId, domain.domainId],
  );

  const debouncedPatch = useDebouncedCallback(patch, 600);

  const persistManualNote = useCallback(
    (text: string, mode: "draft" | "finalize") => {
      const run = async () => {
        setNoteStatus("saving");
        setSaving(true);
        setError(null);
        try {
          const res = await fetch(`/api/episodes/${episodeId}/domains/${domain.domainId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ excerpt: text, mode }),
          });
          const data = await parseApiResponse<{ domain?: DomainDetail; error?: string }>(res);
          if (!res.ok || !data.domain) {
            throw new Error(data.error ?? "Failed to save evidence note");
          }
          setDomain(data.domain);
          setManualNoteDirty(false);
          dirtyRef.current = false;
          if (mode === "finalize") {
            setNoteStatus("saved");
            setForceOpenRecordsNotes(true);
          } else if (text.trim()) {
            setNoteStatus("idle");
            setForceOpenRecordsNotes(true);
          } else {
            setNoteStatus("idle");
          }
        } catch (err) {
          setNoteStatus("error");
          setError(err instanceof Error ? err.message : "Failed to save evidence note");
          throw err;
        } finally {
          setSaving(false);
        }
      };

      // Serialize draft/finalize/nav-flush so an in-flight draft save cannot race a second write.
      const next = persistChainRef.current.then(run, run);
      persistChainRef.current = next.then(
        () => undefined,
        () => undefined,
      );
      return next;
    },
    [episodeId, domain.domainId],
  );

  const {
    schedule: scheduleManualNoteSave,
    flush: flushManualNoteDebounce,
    cancel: cancelManualNoteDebounce,
  } = useFlushableDebouncedCallback(async (text: string) => {
    await persistManualNote(text, "draft");
  }, MANUAL_NOTE_AUTOSAVE_MS);

  const flushManualNote = useCallback(async () => {
    cancelManualNoteDebounce();
    if (!dirtyRef.current && !manualNoteRef.current.trim()) {
      await flushManualNoteDebounce();
      return;
    }
    await persistManualNote(manualNoteRef.current, "draft");
  }, [cancelManualNoteDebounce, flushManualNoteDebounce, persistManualNote]);

  const handleManualNoteChange = useCallback(
    (value: string) => {
      setManualNote(value);
      setManualNoteDirty(true);
      dirtyRef.current = true;
      setNoteStatus("idle");
      scheduleManualNoteSave(value);
    },
    [scheduleManualNoteSave],
  );

  const saveManualNoteExplicit = useCallback(async () => {
    const text = manualNoteRef.current.trim();
    if (!text) return;
    cancelManualNoteDebounce();
    await persistManualNote(text, "finalize");
  }, [cancelManualNoteDebounce, persistManualNote]);

  const startNewNote = useCallback(() => {
    setManualNote("");
    manualNoteRef.current = "";
    setManualNoteDirty(false);
    dirtyRef.current = false;
    setNoteStatus("idle");
  }, []);

  const navigateWithFlush = useCallback(
    async (href: string) => {
      const ok = await flushBeforeNavigate({
        isDirty: dirtyRef.current,
        flush: flushManualNote,
        onBlocked: (message) => {
          setError(message);
          setNoteStatus("error");
        },
      });
      if (ok) router.push(href);
    },
    [flushManualNote, router],
  );

  // Flush on unmount (best-effort; in-app nav uses navigateWithFlush).
  useEffect(() => {
    return () => {
      if (dirtyRef.current && manualNoteRef.current.trim()) {
        // Fire-and-forget beacon-style draft save on teardown.
        void persistManualNote(manualNoteRef.current, "draft").catch(() => {
          /* page is leaving; error already surfaced if in-app nav */
        });
      }
    };
    // intentionally only on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

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
      const key = e.key.toLowerCase();
      if (key === "g" && stage === "formulate") {
        e.preventDefault();
        void generateSynthesis();
      } else if (key === "c" && stage === "report") {
        e.preventDefault();
        copySynthesisToReport();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [copySynthesisToReport, generateSynthesis, stage]);

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
    <div className={`assessment-root dm-stage-root dm-stage-root--${stage}`}>
      <div className="assessment-shell assessment-shell--wide">
        <header className="assessment-header assessment-header--minimal">
          <div className="dm-header-row">
            <p className="dm-breadcrumb">
              <Link
                href={`/cases/${episodeId}/domains`}
                onClick={(e) => {
                  e.preventDefault();
                  void navigateWithFlush(`/cases/${episodeId}/domains`);
                }}
              >
                Domain review
              </Link>
              {" · "}
              <Link
                href={`/cases/${episodeId}/assessment`}
                onClick={(e) => {
                  e.preventDefault();
                  void navigateWithFlush(`/cases/${episodeId}/assessment`);
                }}
              >
                Finding review
              </Link>
            </p>
            <div className="dm-header-actions">
              <div className="dm-shortcuts-wrap" ref={shortcutsRef}>
                <button
                  type="button"
                  className="dm-btn dm-btn--ghost"
                  onClick={() => setShortcutsOpen((v) => !v)}
                  aria-expanded={shortcutsOpen}
                >
                  ?
                </button>
                {shortcutsOpen && (
                  <div className="dm-shortcuts-popover" aria-label="Keyboard shortcuts">
                    <p className="dm-shortcuts-title">Shortcuts</p>
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
                  className="dm-btn dm-btn--ghost"
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

          <header className="dm-sticky-chrome">
            <h1 className="dm-domain-title">{domain.label}</h1>
            {coverage.expected > 0 && (
              <p className="dm-domain-coverage">
                Coverage {coverage.percent}% ({coverage.present} of {coverage.expected} sources)
              </p>
            )}

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

            <p className="dm-stage-guidance">{activeStage.guidance}</p>
          </header>

          <div
            className={`dm-workspace-layout${stage === "report" ? " dm-workspace-layout--report" : ""}${stage === "formulate" ? " dm-workspace-layout--formulate" : ""}`}
          >
            <div className={`dm-reasoning-column dm-stage-surface dm-stage-surface--${stage}`}>
              {stage === "understand" && (
                <UnderstandStage
                  domainId={domain.domainId}
                  confirmedFindingCount={domain.confirmedFindingCount}
                  evidenceCount={domain.evidenceCount}
                  sourceTypes={domain.sourceTypes}
                  evidenceBuckets={domain.evidenceBuckets}
                  manualNote={manualNote}
                  saving={saving}
                  noteStatus={noteStatus}
                  forceOpenRecordsNotes={forceOpenRecordsNotes}
                  onManualNoteChange={handleManualNoteChange}
                  onAddNote={() => void saveManualNoteExplicit()}
                  onStartNewNote={startNewNote}
                />
              )}

              {stage === "formulate" && (
                <FormulateStage
                  domain={domain}
                  altText={altText}
                  differentialPrompts={differentialPrompts}
                  selectedAlternatives={selectedAlternatives}
                  newQuestion={newQuestion}
                  saving={saving}
                  generatingSynthesis={generatingSynthesis}
                  generatingQuestions={generatingQuestions}
                  generatingDifferentials={generatingDifferentials}
                  onFormulationChange={patchFormulation}
                  onSynthesisChange={(value) => {
                    setDomain((d) => ({ ...d, evidenceSummaryDraft: value }));
                    debouncedPatch({ evidenceSummaryDraft: value || null });
                  }}
                  onGenerateSynthesis={() => void generateSynthesis()}
                  onQuestionsChange={patchQuestions}
                  onGenerateQuestions={(replaceAll) => void generateQuestions(replaceAll)}
                  onNewQuestionChange={setNewQuestion}
                  onAddQuestion={addManualQuestion}
                  onAltTextChange={setAltText}
                  onCommitAlternatives={commitAlternatives}
                  onToggleAlternative={toggleAlternative}
                  onDismissDifferentialPrompts={() => setDifferentialPrompts([])}
                  onGenerateDifferentials={() => void generateDifferentials()}
                />
              )}

              {stage === "report" && (
                <ReportStage
                  summaryDraft={domain.summaryDraft}
                  evidenceSummaryDraft={domain.evidenceSummaryDraft}
                  saving={saving}
                  lastEditedAt={reportLastEditedAt}
                  onSummaryChange={(value) => {
                    setDomain((d) => ({ ...d, summaryDraft: value || null }));
                    debouncedPatch({ summaryDraft: value || null });
                  }}
                  onCopySynthesisToReport={copySynthesisToReport}
                />
              )}
            </div>

            {stage !== "formulate" && (
              <DomainStatusSidebar
                episodeId={episodeId}
                domain={domain}
                allDomains={allDomains}
                saving={saving}
                onPatch={(body) => void patch(body)}
                onNavigate={navigateWithFlush}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
