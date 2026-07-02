"use client";

import { useState } from "react";
import { parseApiResponse } from "@/lib/parse-api-response";
import type { AssessmentSessionRecord } from "@/lib/episodes";

export function SessionLinkControls({
  session: initialSession,
  onUpdate,
}: {
  session: AssessmentSessionRecord;
  onUpdate: (s: AssessmentSessionRecord) => void;
}) {
  const [session, setSession] = useState(initialSession);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAction = async (action: "revoke_token" | "extend_token") => {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/episodes/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await parseApiResponse<{
        error?: string;
        session?: AssessmentSessionRecord;
      }>(res);
      if (!res.ok || !data.session) throw new Error(data.error ?? "Failed");
      setSession(data.session);
      onUpdate(data.session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading(null);
    }
  };

  if (session.status !== "DRAFT") return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {session.tokenExpiresAt && (
        <span className="text-gray-500">
          Expires {new Date(session.tokenExpiresAt).toLocaleDateString()}
        </span>
      )}
      {session.revokedAt ? (
        <span className="text-amber-700">Intake link revoked</span>
      ) : (
        <>
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => runAction("extend_token")}
            className="rounded border border-gray-300 px-2 py-1 text-gray-600 hover:bg-gray-50"
          >
            {loading === "extend_token" ? "…" : "Extend 30 days"}
          </button>
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => runAction("revoke_token")}
            className="rounded border border-red-200 px-2 py-1 text-red-700 hover:bg-red-50"
          >
            {loading === "revoke_token" ? "…" : "Revoke link"}
          </button>
        </>
      )}
      {error && <span className="text-red-600">{error}</span>}
    </div>
  );
}
