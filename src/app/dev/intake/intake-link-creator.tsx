"use client";

import Link from "next/link";
import { useState } from "react";

export function IntakeLinkCreator() {
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    intakeUrl: string;
    reviewUrl: string;
  } | null>(null);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName: clientName.trim() || undefined }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setCreated({ intakeUrl: data.intakeUrl, reviewUrl: data.reviewUrl });
    } catch {
      setError("Could not create session. Run: npm run db:push");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8">
      <label htmlFor="client-name" className="block text-sm font-medium text-gray-700">
        Client name (optional)
      </label>
      <input
        id="client-name"
        value={clientName}
        onChange={(e) => setClientName(e.target.value)}
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <button
        type="button"
        onClick={handleCreate}
        disabled={loading}
        className="mt-4 ui-btn ui-btn-primary px-4 py-2.5 text-sm disabled:opacity-50"
      >
        {loading ? "Creating…" : "Create intake link"}
      </button>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {created && (
        <div className="mt-8 space-y-4 rounded-lg border border-gray-200 bg-white p-5 text-sm">
          <div>
            <p className="font-medium">Client intake</p>
            <Link href={created.intakeUrl} className="mt-1 block break-all text-[var(--muted)] hover:text-[var(--foreground)]">
              {created.intakeUrl}
            </Link>
          </div>
          <div>
            <p className="font-medium">Clinician review</p>
            <Link href={created.reviewUrl} className="mt-1 block break-all text-[var(--muted)] hover:text-[var(--foreground)]">
              {created.reviewUrl}
            </Link>
            <p className="mt-2 text-xs text-gray-500">Works after client submits.</p>
          </div>
        </div>
      )}
    </div>
  );
}
