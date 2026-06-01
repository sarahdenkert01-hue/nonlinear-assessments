"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ClientCreator() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!displayName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          email: email.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setDisplayName("");
      setEmail("");
      router.refresh();
    } catch {
      setError("Could not create client.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ui-card p-5">
      <label htmlFor="client-display" className="ui-label">
        Display name
      </label>
      <input
        id="client-display"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        className="ui-input"
      />
      <label htmlFor="client-email" className="ui-label mt-4">
        Email <span className="font-normal text-slate-400">(optional)</span>
      </label>
      <input
        id="client-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="ui-input"
      />
      <button
        type="button"
        onClick={handleCreate}
        disabled={loading || !displayName.trim()}
        className="ui-btn ui-btn-primary mt-5"
      >
        {loading ? "Creating…" : "Add client"}
      </button>
      {error && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
