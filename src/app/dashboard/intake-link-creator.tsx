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
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      {clients.length > 0 && (
        <>
          <label htmlFor="existing-client" className="block text-sm font-medium text-gray-700">
            Existing client (optional)
          </label>
          <select
            id="existing-client"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">— One-off intake —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.displayName}
              </option>
            ))}
          </select>
        </>
      )}
      {!clientId && (
        <>
          <label htmlFor="client-name" className="mt-3 block text-sm font-medium text-gray-700">
            Client name (optional)
          </label>
          <input
            id="client-name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </>
      )}
      <button
        type="button"
        onClick={handleCreate}
        disabled={loading}
        className="mt-4 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Creating…" : "Create intake link"}
      </button>
      <p className="mt-2 text-xs text-gray-500">
        Links expire in 30 days. Manage clients on{" "}
        <Link href="/clients" className="text-blue-600 hover:underline">
          Clients
        </Link>
        .
      </p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {created && (
        <div className="mt-6 space-y-3 border-t border-gray-100 pt-4 text-sm">
          <div>
            <p className="font-medium text-gray-900">Client intake</p>
            <Link href={created.intakeUrl} className="mt-1 block break-all text-blue-600">
              {created.intakeUrl}
            </Link>
          </div>
          <div>
            <p className="font-medium text-gray-900">Clinician review</p>
            <Link href={created.reviewUrl} className="mt-1 block break-all text-blue-600">
              {created.reviewUrl}
            </Link>
            <p className="mt-1 text-xs text-gray-500">Available after the client submits.</p>
          </div>
        </div>
      )}
    </div>
  );
}
