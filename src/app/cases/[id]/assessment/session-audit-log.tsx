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
        const res = await fetch(`/api/episodes/${sessionId}/audit`);
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
    <section className="border-t border-[var(--border)] bg-[var(--background)] px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <h2 className="ui-section-title">Activity log</h2>
        {loading && <p className="mt-3 text-sm text-slate-500">Loading…</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {!loading && !error && events.length === 0 && (
          <p className="mt-3 text-sm text-slate-500">No activity recorded yet.</p>
        )}
        {!loading && events.length > 0 && (
          <ul className="mt-4 space-y-2">
            {events.map((e) => (
              <li
                key={e.id}
                className="ui-card flex items-baseline justify-between gap-4 px-4 py-2.5 text-sm"
              >
                <span className="text-slate-800">{e.label}</span>
                <time className="shrink-0 text-xs text-slate-500">
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
