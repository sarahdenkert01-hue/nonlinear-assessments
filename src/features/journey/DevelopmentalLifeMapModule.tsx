"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDebouncedCallback } from "@/lib/hooks/useDebouncedCallback";
import {
  LIFE_MAP_STAGES,
  LIFE_MAP_TAGS,
  createEmptyLifeMapEntry,
  parseLifeMapData,
  type ClientModuleRecord,
  type LifeMapEntry,
} from "@/lib/modules";
import { SaveIndicator, type SaveStatus } from "./save-indicator";

export function DevelopmentalLifeMapModule({
  token,
  module: initial,
}: {
  token: string;
  module: ClientModuleRecord;
}) {
  const router = useRouter();
  const [mod, setMod] = useState(initial);
  const [entries, setEntries] = useState<LifeMapEntry[]>(() =>
    parseLifeMapData(initial.data).entries,
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(
    () => parseLifeMapData(initial.data).entries[0]?.id ?? null,
  );
  const dirtyRef = useRef(false);
  const readOnly = mod.status === "SUBMITTED" || mod.status === "COMPLETED";

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current && saveStatus === "error") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [saveStatus]);

  const persist = useDebouncedCallback(async (nextEntries: LifeMapEntry[]) => {
    if (readOnly) return;
    setSaveStatus("saving");
    try {
      const payload = { entries: nextEntries };
      const res = await fetch(`/api/intake/${token}/modules/${mod.moduleKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: payload }),
      });
      if (!res.ok) throw new Error("Save failed");
      const json = await res.json();
      setMod(json.module);
      dirtyRef.current = false;
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }, 800);

  const commit = useCallback(
    (updater: (prev: LifeMapEntry[]) => LifeMapEntry[]) => {
      setEntries((prev) => {
        const next = updater(prev).map((e, i) => ({ ...e, sortOrder: i }));
        dirtyRef.current = true;
        setSaveStatus("idle");
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const addEntry = (lifeStage = "") => {
    const entry = createEmptyLifeMapEntry({
      lifeStage,
      sortOrder: entries.length,
    });
    commit((prev) => [...prev, entry]);
    setExpandedId(entry.id);
  };

  const updateEntry = (id: string, patch: Partial<LifeMapEntry>) => {
    commit((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const removeEntry = (id: string) => {
    commit((prev) => prev.filter((e) => e.id !== id));
    setExpandedId((cur) => (cur === id ? null : cur));
  };

  const moveEntry = (id: string, direction: -1 | 1) => {
    commit((prev) => {
      const index = prev.findIndex((e) => e.id === id);
      if (index < 0) return prev;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, item);
      return copy;
    });
  };

  const toggleTag = (id: string, tag: string) => {
    commit((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const has = e.tags.includes(tag);
        return {
          ...e,
          tags: has ? e.tags.filter((t) => t !== tag) : [...e.tags, tag],
        };
      }),
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/intake/${token}/modules/${mod.moduleKey}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { entries } }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Submit failed");
      }
      dirtyRef.current = false;
      router.push(`/intake/${token}`);
      router.refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/intake/${token}`} className="text-sm text-slate-600 hover:text-slate-900">
          ← Assessment Journey
        </Link>
        <SaveIndicator status={saveStatus} />
      </div>

      <header className="mb-8">
        <h1 className="ui-page-title">{mod.title}</h1>
        <p className="ui-page-lead mt-2">
          Add entries for periods of life that feel meaningful. You do not need an entry for
          every stage — only what helps tell your story.
        </p>
      </header>

      {!readOnly && (
        <div className="mb-6">
          <p className="ui-section-title mb-2">Quick add a life stage</p>
          <div className="flex flex-wrap gap-2">
            {LIFE_MAP_STAGES.map((stage) => (
              <button
                key={stage}
                type="button"
                className="ui-btn ui-btn-secondary px-2.5 py-1 text-xs"
                onClick={() => addEntry(stage)}
              >
                {stage}
              </button>
            ))}
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
          No timeline entries yet.
          {!readOnly && " Add a life stage above, or create a blank entry below."}
        </p>
      ) : (
        <ul className="space-y-4">
          {entries.map((entry, index) => {
            const open = expandedId === entry.id;
            return (
              <li key={entry.id} className="ui-card overflow-hidden">
                <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setExpandedId(open ? null : entry.id)}
                    aria-expanded={open}
                  >
                    <p className="truncate font-medium text-slate-900">
                      {entry.title || entry.lifeStage || `Entry ${index + 1}`}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {entry.lifeStage || "No stage selected"}
                      {entry.tags.length > 0 ? ` · ${entry.tags.slice(0, 3).join(", ")}` : ""}
                    </p>
                  </button>
                  {!readOnly && (
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        className="ui-btn ui-btn-ghost px-2 py-1 text-xs"
                        onClick={() => moveEntry(entry.id, -1)}
                        disabled={index === 0}
                        aria-label="Move earlier"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="ui-btn ui-btn-ghost px-2 py-1 text-xs"
                        onClick={() => moveEntry(entry.id, 1)}
                        disabled={index === entries.length - 1}
                        aria-label="Move later"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="ui-btn ui-btn-ghost px-2 py-1 text-xs text-red-600"
                        onClick={() => removeEntry(entry.id)}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {open && (
                  <div className="space-y-4 px-4 py-4">
                    <div>
                      <label className="ui-label" htmlFor={`stage-${entry.id}`}>
                        Life stage or approximate age
                      </label>
                      <select
                        id={`stage-${entry.id}`}
                        className="ui-input"
                        value={entry.lifeStage}
                        onChange={(e) => updateEntry(entry.id, { lifeStage: e.target.value })}
                        disabled={readOnly}
                      >
                        <option value="">Select…</option>
                        {LIFE_MAP_STAGES.map((stage) => (
                          <option key={stage} value={stage}>
                            {stage}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="ui-label" htmlFor={`title-${entry.id}`}>
                        Title (optional)
                      </label>
                      <input
                        id={`title-${entry.id}`}
                        className="ui-input"
                        value={entry.title}
                        onChange={(e) => updateEntry(entry.id, { title: e.target.value })}
                        readOnly={readOnly}
                        disabled={readOnly}
                        placeholder="A short label for this period"
                      />
                    </div>

                    {(
                      [
                        ["description", "What was happening"],
                        ["supportive", "What felt supportive or easier"],
                        ["difficult", "What felt difficult or confusing"],
                        ["adapted", "Ways you adapted or coped"],
                        ["affectsNow", "How this may still affect you now"],
                      ] as const
                    ).map(([field, label]) => (
                      <div key={field}>
                        <label className="ui-label" htmlFor={`${field}-${entry.id}`}>
                          {label}
                        </label>
                        <textarea
                          id={`${field}-${entry.id}`}
                          className="ui-input min-h-[5rem] resize-y"
                          value={entry[field]}
                          onChange={(e) => updateEntry(entry.id, { [field]: e.target.value })}
                          readOnly={readOnly}
                          disabled={readOnly}
                        />
                      </div>
                    ))}

                    <fieldset>
                      <legend className="ui-label">Category tags (optional)</legend>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {LIFE_MAP_TAGS.map((tag) => {
                          const selected = entry.tags.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              disabled={readOnly}
                              onClick={() => toggleTag(entry.id, tag)}
                              className={`rounded border px-2.5 py-1 text-xs ${
                                selected
                                  ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
                                  : "border-slate-200 bg-white text-slate-700"
                              }`}
                              aria-pressed={selected}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!readOnly && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="ui-btn ui-btn-secondary"
            onClick={() => addEntry()}
          >
            Add entry
          </button>
          <button
            type="button"
            className="ui-btn ui-btn-primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Submitting…" : "Submit life map"}
          </button>
          <Link href={`/intake/${token}`} className="ui-btn ui-btn-ghost">
            Save and return
          </Link>
        </div>
      )}

      {submitError && <p className="mt-4 text-sm text-red-600">{submitError}</p>}
    </div>
  );
}
