"use client";

import type { ClinicalQuestionPrompt, DomainDetail } from "@/lib/domains/types";
import { ClinicalQuestionCards } from "./clinical-question-cards";
import { DifferentialPromptList } from "./differential-prompt-list";

export function FormulateStage({
  domain,
  altText,
  differentialPrompts,
  selectedAlternatives,
  newQuestion,
  saving,
  generatingSynthesis,
  generatingQuestions,
  generatingDifferentials,
  onSynthesisChange,
  onGenerateSynthesis,
  onGapNotesChange,
  onQuestionsChange,
  onGenerateQuestions,
  onNewQuestionChange,
  onAddQuestion,
  onAltTextChange,
  onCommitAlternatives,
  onToggleAlternative,
  onDismissDifferentialPrompts,
  onGenerateDifferentials,
  onClinicianNotesChange,
}: {
  domain: DomainDetail;
  altText: string;
  differentialPrompts: string[];
  selectedAlternatives: Set<string>;
  newQuestion: string;
  saving: boolean;
  generatingSynthesis: boolean;
  generatingQuestions: boolean;
  generatingDifferentials: boolean;
  onSynthesisChange: (value: string) => void;
  onGenerateSynthesis: () => void;
  onGapNotesChange: (value: string) => void;
  onQuestionsChange: (prompts: ClinicalQuestionPrompt[]) => void;
  onGenerateQuestions: (replaceAll: boolean) => void;
  onNewQuestionChange: (value: string) => void;
  onAddQuestion: () => void;
  onAltTextChange: (value: string) => void;
  onCommitAlternatives: () => void;
  onToggleAlternative: (prompt: string) => void;
  onDismissDifferentialPrompts: () => void;
  onGenerateDifferentials: () => void;
  onClinicianNotesChange: (value: string) => void;
}) {
  return (
    <>
      <section id="section-synthesis" className="dm-workspace-section dm-workspace-section--hero">
        <h2 className="dm-section-heading">What does this evidence suggest?</h2>
        <p className="dm-section-lead">
          Draft ideas based on available evidence. Review, edit, or replace as needed.
        </p>
        <div className="dm-panel-head">
          <span className="dm-ai-badge">AI draft</span>
        </div>
        <textarea
          id="clinical-synthesis"
          className="assessment-report-editor dm-synthesis-editor"
          value={domain.evidenceSummaryDraft ?? ""}
          onChange={(e) => onSynthesisChange(e.target.value)}
          placeholder="Your working synthesis of themes, impact, and strengths…"
        />
        <div className="dm-actions dm-actions--tight">
          <button
            type="button"
            className="dm-btn dm-btn--primary"
            onClick={onGenerateSynthesis}
            disabled={generatingSynthesis || saving}
          >
            {generatingSynthesis ? "Generating…" : "Generate draft"}
          </button>
        </div>
      </section>

      <section id="section-opportunities" className="dm-workspace-section">
        <h2 className="dm-section-heading">What information would strengthen confidence?</h2>
        <p className="dm-section-lead">
          Areas where additional information may increase confidence — suggestions, not requirements.
        </p>
        {domain.assessmentOpportunityGroups.length > 0 ? (
          <div className="dm-hint-callouts">
            {domain.assessmentOpportunityGroups.map((group) =>
              group.items.map((item) => (
                <div key={`${group.category}-${item}`} className="dm-hint-callout">
                  <p className="dm-hint-callout-label">{group.label}</p>
                  <p className="dm-hint-callout-text">{item}</p>
                </div>
              )),
            )}
          </div>
        ) : (
          <p className="dm-section-lead">Nothing flagged yet — you may still note areas to explore.</p>
        )}
        <details className="dm-inline-details">
          <summary>Your notes on gaps</summary>
          <textarea
            id="opportunity-notes"
            className="assessment-notes dm-compact-textarea"
            value={domain.evidenceGapNotes ?? ""}
            onChange={(e) => onGapNotesChange(e.target.value)}
            placeholder="Optional — what would you still want to know?"
          />
        </details>
      </section>

      <section id="section-questions" className="dm-workspace-section">
        <h2 className="dm-section-heading">What should I ask next?</h2>
        <p className="dm-section-lead">
          Potential interview prompts to strengthen your understanding.
        </p>
        <div className="dm-actions dm-actions--tight dm-actions--inline">
          <button
            type="button"
            className="dm-btn"
            onClick={() => onGenerateQuestions(false)}
            disabled={generatingQuestions || saving}
          >
            {generatingQuestions ? "Generating…" : "Generate prompts"}
          </button>
          <button
            type="button"
            className="dm-btn dm-btn--ghost"
            onClick={() => onGenerateQuestions(true)}
            disabled={generatingQuestions || saving}
            title="Replace all prompts including edited ones"
          >
            Replace all
          </button>
        </div>

        <ClinicalQuestionCards
          prompts={domain.clinicalQuestionPrompts}
          saving={saving}
          onChange={onQuestionsChange}
        />

        <div className="dm-inline-add">
          <textarea
            id="new-question"
            className="assessment-notes dm-compact-textarea"
            value={newQuestion}
            onChange={(e) => onNewQuestionChange(e.target.value)}
            placeholder="Add your own prompt…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                onAddQuestion();
              }
            }}
          />
          <button
            type="button"
            className="dm-text-btn"
            onClick={onAddQuestion}
            disabled={saving || !newQuestion.trim()}
          >
            Add prompt
          </button>
        </div>
      </section>

      <section id="section-differentials" className="dm-workspace-section">
        <h2 className="dm-section-heading">What else could explain this?</h2>
        <p className="dm-section-lead">
          Reasoning reminders for consideration — not diagnoses.
        </p>

        <DifferentialPromptList
          prompts={differentialPrompts}
          selected={selectedAlternatives}
          saving={saving}
          onToggle={onToggleAlternative}
          onDismissAll={onDismissDifferentialPrompts}
        />

        <textarea
          id="alt-exp"
          className="assessment-notes dm-compact-textarea"
          value={altText}
          onChange={(e) => onAltTextChange(e.target.value)}
          onBlur={onCommitAlternatives}
          placeholder="Factors you are actively considering…"
        />

        <div className="dm-actions dm-actions--tight">
          <button
            type="button"
            className="dm-btn"
            onClick={onGenerateDifferentials}
            disabled={generatingDifferentials || saving}
          >
            {generatingDifferentials ? "Generating…" : "Generate reasoning prompts"}
          </button>
        </div>
      </section>

      <section id="section-clinician-notes" className="dm-workspace-section">
        <h2 className="dm-section-heading">Clinician notes</h2>
        <p className="dm-section-lead">
          Private working notes for your reasoning — not included in the report unless you copy them
          over.
        </p>
        <textarea
          id="clinician-notes"
          className="assessment-notes dm-compact-textarea"
          value={domain.clinicalFormulation.clinicalConsiderations ?? ""}
          onChange={(e) => onClinicianNotesChange(e.target.value)}
          placeholder="Observations, hypotheses, or reminders for yourself…"
        />
      </section>
    </>
  );
}
