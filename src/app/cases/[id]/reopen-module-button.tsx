"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReopenModuleButton({
  episodeId,
  moduleKey,
  moduleTitle,
}: {
  episodeId: string;
  moduleKey: string;
  moduleTitle: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    const clear = window.confirm(
      `Reopen “${moduleTitle}” for editing on the existing assessment link?\n\n` +
        `OK = clear saved answers and reopen\n` +
        `Cancel = abort\n\n` +
        `Other modules, clinician notes, and the intake token are preserved.`,
    );
    if (!clear) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/episodes/${episodeId}/modules/${moduleKey}/reopen`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clearResponses: true }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not reopen module");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        className="ui-btn ui-btn-secondary px-2 py-1 text-xs"
        onClick={() => void handleClick()}
        disabled={loading}
      >
        {loading ? "Reopening…" : "Reopen for editing"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
