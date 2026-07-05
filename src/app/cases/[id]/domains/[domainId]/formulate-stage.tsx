"use client";

import {
  pullUncertaintyFromOpportunities,
  seedCoreFromSynthesis,
} from "@/lib/domains/clinical-formulation";
import type { ClinicalFormulationDraft, ClinicalQuestionPrompt, DomainDetail } from "@/lib/domains/types";
import { FormulationReferencePanel } from "./formulation-reference-panel";

type FormulationField = keyof ClinicalFormulationDraft;

const FLOW_FIELDS: {
  key: FormulationField;
  title: string;
  hint: string;
  seed?: "synthesis" | "opportunities";
}[] = [
  {
    key: "coreUnderstanding",
    title: "Core understanding",
    hint: "What the evidence suggests about functioning in this domain.",
    seed: "synthesis",
  },
  {
    key: "functionalImpact",
    title: "Functional impact",
    hint: "How this shows up in daily life — work, relationships, self-care.",
  },
  {
    key: "strengthsAdaptiveStrategies",
    title: "Strengths & adaptations",
    hint: "Protective factors, coping strategies, and resources.",
  },
  {
    key: "remainingUncertainty",
    title: "Remaining uncertainty",
    hint: "What you still need to know before feeling confident.",
    seed: "opportunities",
  },
  {
    key: "clinicalConsiderations",
    title: "Clinical considerations",
    hint: "Private reasoning notes — your working hypotheses.",
  },
];

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
  onFormulationChange,
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
  onFormulationChange: (next: ClinicalFormulationDraft) => void;
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
  const formulation = domain.clinicalFormulation;

  const updateField = (key: FormulationField, value: string) => {
    onFormulationChange({
      ...formulation,
      [key]: value.trim() ? value : null,
    });
  };

  const runSeed = (action: "synthesis" | "opportunities") => {
    if (action === "synthesis") {
      onFormulationChange(seedCoreFromSynthesis(formulation, domain.evidenceSummaryDraft));
    } else {
      onFormulationChange(
        pullUncertaintyFromOpportunities(formulation, domain.assessmentOpportunityGroups),
      );
    }
  };

  return (
    <div className="dm-formulate-layout">
      <div className="dm-formulation-flow">
        {FLOW_FIELDS.map((field, index) => (
          <div key={field.key} className="dm-flow-step">
            {index > 0 && <div className="dm-flow-connector" aria-hidden="true" />}
            <section className="dm-flow-section">
              <h2 className="dm-flow-title">{field.title}</h2>
              <p className="dm-flow-hint">{field.hint}</p>
              <textarea
                className="assessment-notes dm-flow-textarea"
                value={formulation[field.key] ?? ""}
                onChange={(e) => updateField(field.key, e.target.value)}
                disabled={saving}
              />
              {field.seed && (
                <button
                  type="button"
                  className="dm-btn dm-btn--secondary"
                  onClick={() => runSeed(field.seed!)}
                  disabled={
                    saving ||
                    (field.seed === "synthesis" && !domain.evidenceSummaryDraft?.trim()) ||
                    (field.seed === "opportunities" &&
                      domain.assessmentOpportunityGroups.length === 0)
                  }
                >
                  {field.seed === "synthesis" ? "Seed from synthesis" : "Pull from opportunities"}
                </button>
              )}
            </section>
          </div>
        ))}
      </div>

      <FormulationReferencePanel
        domain={domain}
        altText={altText}
        differentialPrompts={differentialPrompts}
        selectedAlternatives={selectedAlternatives}
        newQuestion={newQuestion}
        saving={saving}
        generatingSynthesis={generatingSynthesis}
        generatingQuestions={generatingQuestions}
        generatingDifferentials={generatingDifferentials}
        onSynthesisChange={onSynthesisChange}
        onGenerateSynthesis={onGenerateSynthesis}
        onQuestionsChange={onQuestionsChange}
        onGenerateQuestions={onGenerateQuestions}
        onNewQuestionChange={onNewQuestionChange}
        onAddQuestion={onAddQuestion}
        onAltTextChange={onAltTextChange}
        onCommitAlternatives={onCommitAlternatives}
        onToggleAlternative={onToggleAlternative}
        onDismissDifferentialPrompts={onDismissDifferentialPrompts}
        onGenerateDifferentials={onGenerateDifferentials}
      />
    </div>
  );
}
