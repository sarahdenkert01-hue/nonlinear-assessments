"use client";

import { useState } from "react";
import type { ClinicalQuestionPrompt } from "@/lib/domains/types";
import { formatQuestionAsEvidenceNote } from "@/lib/domains/clinical-questions";

export function ClinicalQuestionCards({
  prompts,
  saving,
  onChange,
  onAddToEvidence,
}: {
  prompts: ClinicalQuestionPrompt[];
  saving: boolean;
  onChange: (next: ClinicalQuestionPrompt[]) => void;
  onAddToEvidence: (excerpt: string) => Promise<void>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const updatePrompt = (id: string, patch: Partial<ClinicalQuestionPrompt>) => {
    onChange(prompts.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const deletePrompt = (id: string) => {
    onChange(prompts.filter((p) => p.id !== id));
  };

  const startEdit = (prompt: ClinicalQuestionPrompt) => {
    setEditingId(prompt.id);
    setEditText(prompt.text);
  };

  const commitEdit = (id: string) => {
    const text = editText.trim();
    if (text) updatePrompt(id, { text });
    setEditingId(null);
    setEditText("");
  };

  if (prompts.length === 0) {
    return (
      <p className="dm-panel-hint" style={{ marginBottom: "0.75rem" }}>
        No questions yet. Generate prompts or add your own below.
      </p>
    );
  }

  return (
    <div className="dm-question-cards">
      {prompts.map((prompt) => (
        <article
          key={prompt.id}
          className={`dm-question-card${prompt.askedAt ? " dm-question-card--asked" : ""}`}
        >
          {editingId === prompt.id ? (
            <textarea
              className="assessment-notes"
              style={{ minHeight: "3rem", marginBottom: "0.5rem" }}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={() => commitEdit(prompt.id)}
              autoFocus
            />
          ) : (
            <p className="dm-question-card-text">{prompt.text}</p>
          )}

          <div className="dm-question-card-actions">
            <button
              type="button"
              className={`dm-btn dm-btn--sm${prompt.askedAt ? " dm-btn--active" : ""}`}
              onClick={() =>
                updatePrompt(prompt.id, {
                  askedAt: prompt.askedAt ? null : new Date().toISOString(),
                })
              }
              disabled={saving}
            >
              {prompt.askedAt ? "Asked ✓" : "Mark asked"}
            </button>
            <button
              type="button"
              className="dm-btn dm-btn--sm"
              onClick={() => startEdit(prompt)}
              disabled={saving}
            >
              Edit
            </button>
            <button
              type="button"
              className="dm-btn dm-btn--sm"
              onClick={() => deletePrompt(prompt.id)}
              disabled={saving}
            >
              Delete
            </button>
          </div>

          <label className="dm-field-label" htmlFor={`q-note-${prompt.id}`}>
            Note / answer
          </label>
          <textarea
            id={`q-note-${prompt.id}`}
            className="assessment-notes"
            style={{ minHeight: "2.5rem" }}
            value={prompt.note ?? ""}
            onChange={(e) => updatePrompt(prompt.id, { note: e.target.value || null })}
            placeholder="Optional — capture client response or your observation"
          />

          <button
            type="button"
            className="dm-link-btn"
            onClick={() => void onAddToEvidence(formatQuestionAsEvidenceNote(prompt))}
            disabled={saving}
          >
            Add to evidence note
          </button>
        </article>
      ))}
    </div>
  );
}
