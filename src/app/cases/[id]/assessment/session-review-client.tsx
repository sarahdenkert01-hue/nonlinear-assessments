"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useDebouncedCallback } from "@/lib/hooks/useDebouncedCallback";
import { parseApiResponse } from "@/lib/parse-api-response";
import type { AssessmentSessionRecord } from "@/lib/episodes";
import type { FindingRecord } from "@/lib/findings/types";
import {
  StatusBadge,
  sessionStatusLabel,
  sessionStatusVariant,
} from "@/components/ui/status-badge";
import { FindingsReview } from "./findings-review";
import { SessionAuditLog } from "./session-audit-log";
import { SessionLinkControls } from "./session-link-controls";

type PersistStatus = "idle" | "saving" | "saved" | "error";

export function SessionAssessmentReview({
  session: initialSession,
  findings,
}: {
  session: AssessmentSessionRecord;
  findings: FindingRecord[];
}) {
  const [session, setSession] = useState(initialSession);
  const [persistStatus, setPersistStatus] = useState<PersistStatus>("idle");
  const [markingReviewed, setMarkingReviewed] = useState(false);
  const reportFinalized = Boolean(session.reportFinalizedAt);

  const persistReview = useDebouncedCallback(
    async (payload: { clinicianNotes?: string; reportDraft?: string }) => {
      if (reportFinalized && payload.reportDraft) return;
      setPersistStatus("saving");
      try {
        const res = await fetch(`/api/episodes/${session.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await parseApiResponse<{
          error?: string;
          session?: AssessmentSessionRecord;
        }>(res);
        if (!res.ok) throw new Error(data.error ?? "Save failed");
        if (!data.session) throw new Error("Session was not returned");
        setSession(data.session);
        setPersistStatus("saved");
      } catch {
        setPersistStatus("error");
      }
    },
    600,
  );

  const handleNotesChange = useCallback(
    (clinicianNotes: string) => {
      setPersistStatus("idle");
      persistReview({
        clinicianNotes,
        reportDraft: session.reportDraft ?? undefined,
      });
    },
    [persistReview, session.reportDraft],
  );

  const handleReportDraftChange = useCallback(
    (reportDraft: string) => {
      if (reportFinalized) return;
      setSession((prev) => ({ ...prev, reportDraft }));
      setPersistStatus("idle");
      persistReview({
        clinicianNotes: session.clinicianNotes ?? "",
        reportDraft,
      });
    },
    [persistReview, session.clinicianNotes, reportFinalized],
  );

  const handleMarkReviewed = async () => {
    setMarkingReviewed(true);
    setPersistStatus("saving");
    try {
      const res = await fetch(`/api/episodes/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REVIEWED" }),
      });
      const data = await parseApiResponse<{
        error?: string;
        session?: AssessmentSessionRecord;
      }>(res);
      if (!res.ok) throw new Error(data.error ?? "Failed");
      if (!data.session) throw new Error("Session was not returned");
      setSession(data.session);
      setPersistStatus("saved");
    } catch {
      setPersistStatus("error");
    } finally {
      setMarkingReviewed(false);
    }
  };

  const handleFinalizeReport = async () => {
    if (!session.reportDraft?.trim()) return;
    setPersistStatus("saving");
    try {
      const res = await fetch(`/api/episodes/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportFinalized: true,
          reportFinal: session.reportDraft,
        }),
      });
      const data = await parseApiResponse<{
        error?: string;
        session?: AssessmentSessionRecord;
      }>(res);
      if (!res.ok || !data.session) throw new Error(data.error ?? "Failed");
      setSession(data.session);
      setPersistStatus("saved");
    } catch {
      setPersistStatus("error");
    }
  };

  const handleExportReport = () => {
    window.open(`/api/sessions/${session.id}/report/export`, "_blank");
  };

  return (
    <div>
      <div className="border-b border-[var(--border)] bg-white px-6 py-3">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <StatusBadge variant={sessionStatusVariant(session)}>
              {sessionStatusLabel(session)}
            </StatusBadge>
            {session.reviewedAt && (
              <span>Reviewed {new Date(session.reviewedAt).toLocaleDateString()}</span>
            )}
            {reportFinalized && (
              <span className="font-medium text-emerald-700">Report finalized</span>
            )}
            <PersistIndicator status={persistStatus} />
            <SessionLinkControls session={session} onUpdate={setSession} />
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="ui-btn ui-btn-ghost px-2 py-1 text-xs">
              ← Dashboard
            </Link>
            {session.status !== "REVIEWED" && (
              <button
                type="button"
                onClick={handleMarkReviewed}
                disabled={markingReviewed}
                className="ui-btn ui-btn-secondary px-3 py-1.5 text-xs"
              >
                {markingReviewed ? "Saving…" : "Mark as reviewed"}
              </button>
            )}
          </div>
        </div>
      </div>
      <FindingsReview
        sessionId={session.id}
        clientName={session.clientName ?? undefined}
        initialFindings={findings}
        clinicianNotes={session.clinicianNotes ?? ""}
        reportDraft={session.reportDraft}
        reportGeneratedAt={session.reportGeneratedAt}
        reportFinalized={reportFinalized}
        onNotesChange={handleNotesChange}
        onReportDraftChange={handleReportDraftChange}
        onReportGenerated={(report) => {
          setSession((prev) => ({
            ...prev,
            reportDraft: report.draft,
            reportGeneratedAt: report.generatedAt,
          }));
        }}
        onFinalizeReport={handleFinalizeReport}
        onExportReport={handleExportReport}
      />
      <SessionAuditLog sessionId={session.id} />
    </div>
  );
}

function PersistIndicator({ status }: { status: PersistStatus }) {
  if (status === "saving") return <span>Saving…</span>;
  if (status === "saved") return <span className="text-green-600">Saved</span>;
  if (status === "error") return <span className="text-amber-600">Save failed</span>;
  return null;
}
