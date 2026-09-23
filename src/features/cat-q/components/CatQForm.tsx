"use client";

import {
  CAT_Q_ATTRIBUTION,
  CAT_Q_ITEMS,
  CAT_Q_LIKERT_OPTIONS,
} from "../data/items";
import type { CatQAnswers, CatQLikertValue } from "../types";

export type CatQFormProps = {
  answers: CatQAnswers;
  onChange: (next: CatQAnswers) => void;
  readOnly?: boolean;
  /** Jump highlight for incomplete submit. */
  focusItemId?: string | null;
  onFocusItemConsumed?: () => void;
};

export function CatQForm({
  answers,
  onChange,
  readOnly = false,
  focusItemId = null,
  onFocusItemConsumed,
}: CatQFormProps) {
  const setAnswer = (itemId: string, value: CatQLikertValue) => {
    if (readOnly) return;
    onChange({ ...answers, [itemId]: value });
  };

  return (
    <div className="space-y-6">
      <ol className="space-y-6">
        {CAT_Q_ITEMS.map((item) => {
          const selected = answers[item.id];
          const focused = focusItemId === item.id;
          return (
            <li
              key={item.id}
              id={`catq-item-${item.id}`}
              className={`rounded-md border px-4 py-4 ${
                focused
                  ? "border-amber-400 bg-amber-50/60"
                  : "border-[var(--border)] bg-white"
              }`}
              ref={(node) => {
                if (focused && node) {
                  node.scrollIntoView({ behavior: "smooth", block: "center" });
                  onFocusItemConsumed?.();
                }
              }}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Item {item.itemNumber} of {CAT_Q_ITEMS.length}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">{item.text}</p>
              <fieldset className="mt-4" disabled={readOnly}>
                <legend className="sr-only">Response for item {item.itemNumber}</legend>
                <div className="grid gap-2 sm:grid-cols-1">
                  {CAT_Q_LIKERT_OPTIONS.map((option) => {
                    const checked = selected === option.value;
                    return (
                      <label
                        key={option.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm ${
                          checked
                            ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                            : "border-slate-200 hover:border-slate-300"
                        } ${readOnly ? "cursor-default" : ""}`}
                      >
                        <input
                          type="radio"
                          name={item.id}
                          value={option.value}
                          checked={checked}
                          disabled={readOnly}
                          onChange={() => setAnswer(item.id, option.value)}
                          className="h-4 w-4"
                        />
                        <span className="font-medium text-slate-800">{option.value}</span>
                        <span className="text-slate-600">{option.label}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </li>
          );
        })}
      </ol>

      <p className="text-xs text-slate-500">
        Camouflaging Autistic Traits Questionnaire (CAT-Q). {CAT_Q_ATTRIBUTION} Do not
        alter the validated questionnaire wording.
      </p>
    </div>
  );
}
