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
    <div className="dm-differential-prompts">
      <div className="dm-differential-prompts-head">
        <span className="dm-ephemeral-label">Suggested prompts</span>
        <span className="dm-ai-badge">AI draft</span>
      </div>
      <ul className="dm-checklist dm-checklist--compact">
        {prompts.map((prompt) => {
          const active = selected.has(prompt);
          return (
            <li key={prompt} className={`dm-checklist-item${active ? " dm-checklist-item--done" : ""}`}>
              <label className="dm-checklist-check">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => onToggle(prompt)}
                  disabled={saving}
                  aria-label={`Include: ${prompt}`}
                />
              </label>
              <button
                type="button"
                className="dm-checklist-text dm-checklist-text--btn"
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
