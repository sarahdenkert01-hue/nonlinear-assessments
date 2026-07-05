"use client";

import {
  pullUncertaintyFromOpportunities,
  seedCoreFromSynthesis,
} from "@/lib/domains/clinical-formulation";
import type { ClinicalFormulationDraft, DomainDetail } from "@/lib/domains/types";
import { FormulationContextRail } from "./formulation-context-rail";

type FormulationField = keyof ClinicalFormulationDraft;

const FIELDS: {
  key: FormulationField;
  title: string;
  hint: string;
  seedLabel?: string;
  seedAction?: "synthesis" | "opportunities";
}[] = [
  {
    key: "coreUnderstanding",
    title: "Core understanding",
    hint: "A concise formulation of what the current evidence suggests about functioning in this domain.",
    seedLabel: "Seed from synthesis",
    seedAction: "synthesis",
  },
  {
    key: "functionalImpact",
    title: "Functional impact",
    hint: "How this domain affects everyday life — work, relationships, self-care, consistency.",
  },
  {
    key: "strengthsAdaptiveStrategies",
    title: "Strengths & adaptive strategies",
    hint: "Protective factors, coping, compensations, interests, and resources.",
  },
  {
    key: "remainingUncertainty",
    title: "Remaining uncertainty",
    hint: "Unanswered questions and areas requiring further assessment.",
    seedLabel: "Pull from opportunities",
    seedAction: "opportunities",
  },
  {
    key: "clinicalConsiderations",
    title: "Clinical considerations",
    hint: "Editable clinician reasoning notes — not AI-generated conclusions.",
  },
];

export function FormulationWorkspace({
  domain,
  saving,
  onFormulationChange,
  onGoToUnderstand,
}: {
  domain: DomainDetail;
  saving: boolean;
  onFormulationChange: (next: ClinicalFormulationDraft) => void;
  onGoToUnderstand: () => void;
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
      <div className="dm-formulate-main">
        <header className="dm-formulate-header">
          <p className="dm-section-step">Formulation</p>
          <h2 className="dm-panel-title dm-panel-title--lg">Clinical formulation</h2>
          <p className="dm-panel-hint dm-panel-hint--tight">
            How do I currently understand this person&apos;s functioning, and what evidence
            supports that understanding?
          </p>
        </header>

        {FIELDS.map((field) => (
          <section key={field.key} className="dm-panel dm-section dm-panel--compact">
            <h3 className="dm-panel-title">{field.title}</h3>
            <p className="dm-panel-hint dm-panel-hint--tight">{field.hint}</p>
            <textarea
              className="assessment-report-editor"
              style={{ minHeight: "5.5rem" }}
              value={formulation[field.key] ?? ""}
              onChange={(e) => updateField(field.key, e.target.value)}
              disabled={saving}
            />
            {field.seedAction && field.seedLabel ? (
              <div className="dm-actions">
                <button
                  type="button"
                  className="dm-btn"
                  onClick={() => runSeed(field.seedAction!)}
                  disabled={
                    saving ||
                    (field.seedAction === "synthesis" && !domain.evidenceSummaryDraft?.trim()) ||
                    (field.seedAction === "opportunities" &&
                      domain.assessmentOpportunityGroups.length === 0)
                  }
                >
                  {field.seedLabel}
                </button>
              </div>
            ) : null}
          </section>
        ))}
      </div>

      <FormulationContextRail domain={domain} onGoToUnderstand={onGoToUnderstand} />
    </div>
  );
}
