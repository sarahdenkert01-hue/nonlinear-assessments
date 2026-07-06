"use client";

import type { ClinicalQuestionPrompt, DomainDetail } from "@/lib/domains/types";
import { ClinicalQuestionCards } from "./clinical-question-cards";
import { DifferentialPromptList } from "./differential-prompt-list";

export function FormulationReferencePanel({
  domain,
  differentialPrompts,
  selectedAlternatives,
  newQuestion,
  saving,
  generatingSynthesis,
  generatingQuestions,
  generatingDifferentials,
  onSynthesisChange,
  onGenerateSynthesis,
  onQuestionsChange,
  onGenerateQuestions,
  onNewQuestionChange,
  onAddQuestion,
  onAltTextChange,
  onCommitAlternatives,
  onToggleAlternative,
  onDismissDifferentialPrompts,
  onGenerateDifferentials,
  altText,
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
  onQuestionsChange: (prompts: ClinicalQuestionPrompt[]) => void;
  onGenerateQuestions: (replaceAll: boolean) => void;
  onNewQuestionChange: (value: string) => void;
  onAddQuestion: () => void;
  onAltTextChange: (value: string) => void;
  onCommitAlternatives: () => void;
  onToggleAlternative: (prompt: string) => void;
  onDismissDifferentialPrompts: () => void;
  onGenerateDifferentials: () => void;
}) {
  return (
    <aside className="dm-reference-panel" aria-label="Reference">
      <p className="dm-reference-kicker">Reference</p>

      <section className="dm-reference-block">
        <h3 className="dm-reference-heading">Clinical synthesis</h3>
        <textarea
          className="assessment-notes dm-reference-synthesis"
          value={domain.evidenceSummaryDraft ?? ""}
          onChange={(e) => onSynthesisChange(e.target.value)}
          placeholder="Draft from evidence…"
          disabled={saving}
        />
        <button
          type="button"
          className="dm-text-btn dm-text-btn--muted"
          onClick={onGenerateSynthesis}
          disabled={generatingSynthesis || saving}
        >
          {generatingSynthesis ? "Generating…" : "Generate draft"}
        </button>
      </section>

      <section className="dm-reference-block">
        <h3 className="dm-reference-heading">Confirmed evidence</h3>
        {domain.findings.length === 0 ? (
          <p className="dm-reference-text">No confirmed findings linked.</p>
        ) : (
          <ul className="dm-reference-list">
            {domain.findings.map((f) => (
              <li key={f.id}>
                {f.label}
                <span className="dm-reference-meta">
                  {f.hits}/{f.total}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="dm-reference-block">
        <h3 className="dm-reference-heading">Opportunities</h3>
        {domain.assessmentOpportunityGroups.length === 0 ? (
          <p className="dm-reference-text">None flagged.</p>
        ) : (
          <ul className="dm-reference-list dm-reference-list--plain">
            {domain.assessmentOpportunityGroups.flatMap((g) =>
              g.items.map((item) => (
                <li key={`${g.category}-${item}`}>
                  <span className="dm-reference-meta">{g.label}</span>
                  {item}
                </li>
              )),
            )}
          </ul>
        )}
      </section>

      <section className="dm-reference-block">
        <div className="dm-reference-block-head">
          <h3 className="dm-reference-heading">Interview prompts</h3>
          <div className="dm-reference-actions">
            <button
              type="button"
              className="dm-text-btn dm-text-btn--muted"
              onClick={() => onGenerateQuestions(false)}
              disabled={generatingQuestions || saving}
            >
              {generatingQuestions ? "…" : "Generate"}
            </button>
            <button
              type="button"
              className="dm-text-btn dm-text-btn--muted"
              onClick={() => onGenerateQuestions(true)}
              disabled={generatingQuestions || saving}
            >
              Replace all
            </button>
          </div>
        </div>
        <ClinicalQuestionCards
          prompts={domain.clinicalQuestionPrompts}
          saving={saving}
          onChange={onQuestionsChange}
        />
        <textarea
          className="assessment-notes dm-reference-input"
          value={newQuestion}
          onChange={(e) => onNewQuestionChange(e.target.value)}
          placeholder="Add prompt…"
        />
        <button
          type="button"
          className="dm-text-btn dm-text-btn--muted"
          onClick={onAddQuestion}
          disabled={saving || !newQuestion.trim()}
        >
          Add prompt
        </button>
      </section>

      <section className="dm-reference-block">
        <h3 className="dm-reference-heading">Alternative explanations</h3>
        <DifferentialPromptList
          prompts={differentialPrompts}
          selected={selectedAlternatives}
          saving={saving}
          onToggle={onToggleAlternative}
          onDismissAll={onDismissDifferentialPrompts}
        />
        <textarea
          className="assessment-notes dm-reference-input"
          value={altText}
          onChange={(e) => onAltTextChange(e.target.value)}
          onBlur={onCommitAlternatives}
          placeholder="Factors under consideration…"
        />
        <button
          type="button"
          className="dm-text-btn dm-text-btn--muted"
          onClick={onGenerateDifferentials}
          disabled={generatingDifferentials || saving}
        >
          {generatingDifferentials ? "Generating…" : "Generate prompts"}
        </button>
      </section>
    </aside>
  );
}
