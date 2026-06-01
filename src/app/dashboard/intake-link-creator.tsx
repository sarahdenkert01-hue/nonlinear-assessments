"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface ClientOption {
  id: string;
  displayName: string;
}

export function IntakeLinkCreator() {
  const router = useRouter();
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState("");
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    intakeUrl: string;
    reviewUrl: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => (res.ok ? res.json() : { clients: [] }))
      .then((data) => setClients(data.clients ?? []))
      .catch(() => {});
  }, []);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    setCreated(null);
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: clientId ? undefined : clientName.trim() || undefined,
          clientId: clientId || undefined,
        }),
      });
      if (res.status === 401) {
        router.push("/sign-in");
        return;
      }
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setCreated({ intakeUrl: data.intakeUrl, reviewUrl: data.reviewUrl });
      router.refresh();
    } catch {
      setError("Could not create session.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ui-card p-5">
      {clients.length > 0 && (
        <div>
          <label htmlFor="existing-client" className="ui-label">
            Existing client
          </label>
          <select
            id="existing-client"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="ui-input"
          >
            <option value="">One-off intake</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.displayName}
              </option>
            ))}
          </select>
        </div>
      )}
      {!clientId && (
        <div className={clients.length > 0 ? "mt-4" : ""}>
          <label htmlFor="client-name" className="ui-label">
            Client name <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="client-name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="ui-input"
            placeholder="e.g. Alex M."
          />
        </div>
      )}
      <button
        type="button"
        onClick={handleCreate}
        disabled={loading}
        className="ui-btn ui-btn-primary mt-5 w-full sm:w-auto"
      >
        {loading ? "Creating…" : "Create intake link"}
      </button>
      <p className="mt-3 text-xs text-slate-500">
        Links expire in 30 days.{" "}
        <Link href="/clients" className="font-medium text-[var(--accent)] hover:underline">
          Manage clients
        </Link>
      </p>
      {error && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {created && (
        <div className="mt-6 space-y-4 rounded-md border border-[var(--border)] bg-slate-50/80 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Client intake
            </p>
            <a
              href={created.intakeUrl}
              className="mt-1 block break-all text-sm font-medium text-[var(--accent)] hover:underline"
            >
              {created.intakeUrl}
            </a>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Clinician review
            </p>
            <a
              href={created.reviewUrl}
              className="mt-1 block break-all text-sm font-medium text-[var(--accent)] hover:underline"
            >
              {created.reviewUrl}
            </a>
            <p className="mt-1 text-xs text-slate-500">Available after the client submits.</p>
          </div>
        </div>
      )}
    </div>
  );
}
