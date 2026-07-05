"use client";

import { useState } from "react";
import type { ClinicalQuestionPrompt } from "@/lib/domains/types";

export function ClinicalQuestionCards({
  prompts,
  saving,
  onChange,
}: {
  prompts: ClinicalQuestionPrompt[];
  saving: boolean;
  onChange: (next: ClinicalQuestionPrompt[]) => void;
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

  const copyPrompt = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (prompts.length === 0) {
    return (
      <p className="dm-section-lead">
        Generate prompts or add your own — new prompts append to this list.
      </p>
    );
  }

  return (
    <div className="dm-prompt-cards">
      {prompts.map((prompt) => (
        <article key={prompt.id} className="dm-prompt-card">
          {editingId === prompt.id ? (
            <textarea
              className="dm-prompt-card-edit"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={() => commitEdit(prompt.id)}
              autoFocus
            />
          ) : (
            <p className="dm-prompt-card-text">{prompt.text}</p>
          )}
          <div className="dm-prompt-card-actions">
            <button
              type="button"
              className="dm-text-btn"
              onClick={() => void copyPrompt(prompt.text)}
              disabled={saving}
            >
              Copy
            </button>
            <button
              type="button"
              className="dm-text-btn"
              onClick={() => startEdit(prompt)}
              disabled={saving}
            >
              Edit
            </button>
            <button
              type="button"
              className="dm-text-btn dm-text-btn--muted"
              onClick={() => deletePrompt(prompt.id)}
              disabled={saving}
            >
              Delete
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
