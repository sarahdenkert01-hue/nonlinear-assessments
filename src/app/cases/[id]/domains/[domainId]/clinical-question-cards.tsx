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
  onAddToEvidence?: (excerpt: string) => Promise<void>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const updatePrompt = (id: string, patch: Partial<ClinicalQuestionPrompt>) => {
    onChange(prompts.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const dismissPrompt = (id: string) => {
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
      <p className="dm-panel-hint dm-panel-hint--tight">
        Generate prompts or add your own — they append to this working list.
      </p>
    );
  }

  return (
    <ul className="dm-checklist">
      {prompts.map((prompt) => (
        <li
          key={prompt.id}
          className={`dm-checklist-item${prompt.askedAt ? " dm-checklist-item--done" : ""}`}
        >
          <label className="dm-checklist-check">
            <input
              type="checkbox"
              checked={Boolean(prompt.askedAt)}
              onChange={() =>
                updatePrompt(prompt.id, {
                  askedAt: prompt.askedAt ? null : new Date().toISOString(),
                })
              }
              disabled={saving}
              aria-label={prompt.askedAt ? "Mark as not yet asked" : "Mark as asked"}
            />
          </label>

          {editingId === prompt.id ? (
            <textarea
              className="dm-checklist-edit"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={() => commitEdit(prompt.id)}
              autoFocus
            />
          ) : (
            <span className="dm-checklist-text">{prompt.text}</span>
          )}

          <div className="dm-checklist-actions">
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
              onClick={() => dismissPrompt(prompt.id)}
              disabled={saving}
            >
              Dismiss
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
