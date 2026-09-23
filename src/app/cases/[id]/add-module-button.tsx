"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddModuleButton({
  episodeId,
  moduleKey,
  label,
}: {
  episodeId: string;
  moduleKey: string;
  label: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/episodes/${episodeId}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleKeys: [moduleKey] }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setError(data.error ?? "Already assigned to this episode.");
        router.refresh();
        return;
      }
      if (!res.ok) {
        throw new Error(data.error ?? "Could not add module");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        className="ui-btn ui-btn-secondary px-3 py-1.5 text-xs"
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? "Adding…" : label}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
