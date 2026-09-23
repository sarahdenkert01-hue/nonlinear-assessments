"use client";

import {
  CAT_Q_ATTRIBUTION,
  CAT_Q_ITEMS,
  CAT_Q_LIKERT_OPTIONS,
  CAT_Q_SCORE_MAXIMA,
} from "../data/items";
import { computeCatQScores } from "../lib/scoring";
import type { CatQAnswers, CatQSubscale } from "../types";

export type CatQResultsProps = {
  answers: CatQAnswers;
  submittedAt: string | null;
};

const SUBSCALE_LABELS: Record<CatQSubscale, string> = {
  compensation: "Compensation",
  masking: "Masking",
  assimilation: "Assimilation",
};

function likertLabel(value: number | undefined): string {
  if (value === undefined) return "—";
  const opt = CAT_Q_LIKERT_OPTIONS.find((o) => o.value === value);
  return opt ? `${opt.value} — ${opt.label}` : String(value);
}

export function CatQResults({ answers, submittedAt }: CatQResultsProps) {
  const scores = computeCatQScores(answers, CAT_Q_ITEMS);

  return (
    <div className="mt-8 space-y-8">
      <header>
        <h2 className="ui-page-title">
          Camouflaging Autistic Traits Questionnaire (CAT-Q)
        </h2>
        <p className="ui-page-lead mt-1">
          Completed:{" "}
          {submittedAt ? new Date(submittedAt).toLocaleString() : "Not submitted"}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Dimensional scores only — higher scores reflect greater self-reported
          camouflaging. No automatic clinical cutoffs or diagnostic labels.
        </p>
      </header>

      <section>
        <h3 className="ui-section-title">Scores</h3>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <ScoreCard
            label="CAT-Q Total"
            value={scores.total}
            max={CAT_Q_SCORE_MAXIMA.total}
          />
          <ScoreCard
            label="Compensation"
            value={scores.compensation}
            max={CAT_Q_SCORE_MAXIMA.compensation}
          />
          <ScoreCard
            label="Masking"
            value={scores.masking}
            max={CAT_Q_SCORE_MAXIMA.masking}
          />
          <ScoreCard
            label="Assimilation"
            value={scores.assimilation}
            max={CAT_Q_SCORE_MAXIMA.assimilation}
          />
        </dl>
      </section>

      <section>
        <h3 className="ui-section-title">Response Details</h3>
        <ol className="mt-4 space-y-3">
          {CAT_Q_ITEMS.map((item) => (
            <li
              key={item.id}
              className="rounded-md border border-[var(--border)] px-4 py-3 text-sm"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Item {item.itemNumber} · {SUBSCALE_LABELS[item.subscale]}
                {item.reverseScored ? " · reverse scored" : ""}
              </p>
              <p className="mt-1 font-medium text-slate-900">{item.text}</p>
              <p className="mt-2 text-slate-600">
                Response: {likertLabel(answers[item.id])}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <p className="text-xs text-slate-500">
        Camouflaging Autistic Traits Questionnaire (CAT-Q). {CAT_Q_ATTRIBUTION}
      </p>
    </div>
  );
}

function ScoreCard({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  return (
    <div className="ui-card px-4 py-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
        {value}{" "}
        <span className="text-base font-normal text-slate-500">/ {max}</span>
      </dd>
    </div>
  );
}
