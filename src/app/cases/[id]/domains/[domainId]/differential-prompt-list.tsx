"use client";

export function DifferentialPromptList({
  prompts,
  selected,
  saving,
  onToggle,
  onDismissAll,
}: {
  prompts: string[];
  selected: Set<string>;
  saving: boolean;
  onToggle: (prompt: string) => void;
  onDismissAll: () => void;
}) {
  if (prompts.length === 0) return null;

  return (
    <div className="dm-reasoning-prompts">
      <div className="dm-reasoning-prompts-head">
        <span className="dm-ephemeral-label">For consideration</span>
        <span className="dm-ai-badge">AI draft</span>
      </div>
      <ul className="dm-reasoning-list">
        {prompts.map((prompt) => {
          const active = selected.has(prompt);
          return (
            <li key={prompt}>
              <button
                type="button"
                className={`dm-reasoning-chip${active ? " dm-reasoning-chip--active" : ""}`}
                onClick={() => onToggle(prompt)}
                disabled={saving}
              >
                {prompt}
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" className="dm-text-btn dm-text-btn--muted" onClick={onDismissAll}>
        Dismiss suggestions
      </button>
    </div>
  );
}
