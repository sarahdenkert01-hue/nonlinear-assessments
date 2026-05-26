"use client";

import { useEffect, useState } from "react";

interface AuditEvent {
  id: string;
  action: string;
  label: string;
  actorType: string;
  createdAt: string;
}

export function SessionAuditLog({ sessionId }: { sessionId: string }) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/audit`);
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        if (!cancelled) setEvents(data.events ?? []);
      } catch {
        if (!cancelled) setError("Could not load activity log");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <section className="border-t border-gray-200 bg-[#fafafa] px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Activity log
        </h2>
        {loading && <p className="mt-3 text-sm text-gray-500">Loading…</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {!loading && !error && events.length === 0 && (
          <p className="mt-3 text-sm text-gray-500">No activity recorded yet.</p>
        )}
        {!loading && events.length > 0 && (
          <ul className="mt-4 space-y-2">
            {events.map((e) => (
              <li
                key={e.id}
                className="flex items-baseline justify-between gap-4 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm"
              >
                <span className="text-gray-800">{e.label}</span>
                <time className="shrink-0 text-xs text-gray-500">
                  {new Date(e.createdAt).toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
