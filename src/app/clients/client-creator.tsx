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
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <label htmlFor="client-display" className="block text-sm font-medium text-gray-700">
        Display name
      </label>
      <input
        id="client-display"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <label htmlFor="client-email" className="mt-3 block text-sm font-medium text-gray-700">
        Email (optional)
      </label>
      <input
        id="client-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <button
        type="button"
        onClick={handleCreate}
        disabled={loading || !displayName.trim()}
        className="mt-4 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Creating…" : "Add client"}
      </button>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
