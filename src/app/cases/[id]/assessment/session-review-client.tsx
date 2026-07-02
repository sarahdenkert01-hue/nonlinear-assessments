"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import {
  AssessmentReview,
  type ClinicianOverrides,
} from "@/features/assessments";
import { useDebouncedCallback } from "@/lib/hooks/useDebouncedCallback";
import { parseApiResponse } from "@/lib/parse-api-response";
import type { AssessmentSessionRecord } from "@/lib/episodes";
import {
  StatusBadge,
  sessionStatusLabel,
  sessionStatusVariant,
} from "@/components/ui/status-badge";
import { SessionAuditLog } from "./session-audit-log";
import { SessionLinkControls } from "./session-link-controls";

type PersistStatus = "idle" | "saving" | "saved" | "error";

export function SessionAssessmentReview({
  session: initialSession,
}: {
  session: AssessmentSessionRecord;
}) {
  const [session, setSession] = useState(initialSession);
  const [persistStatus, setPersistStatus] = useState<PersistStatus>("idle");
  const [markingReviewed, setMarkingReviewed] = useState(false);
  const reportFinalized = Boolean(session.reportFinalizedAt);

  const persistReview = useDebouncedCallback(
    async (payload: {
      overrides?: ClinicianOverrides;
      clinicianNotes?: string;
      reportDraft?: string;
    }) => {
      if (reportFinalized && (payload.overrides || payload.reportDraft)) return;
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

  const handleOverridesChange = useCallback(
    (overrides: ClinicianOverrides) => {
      if (reportFinalized) return;
      setPersistStatus("idle");
      persistReview({
        overrides,
        clinicianNotes: session.clinicianNotes ?? "",
        reportDraft: session.reportDraft ?? undefined,
      });
    },
    [persistReview, session.clinicianNotes, session.reportDraft, reportFinalized],
  );

  const handleNotesChange = useCallback(
    (clinicianNotes: string) => {
      setPersistStatus("idle");
      persistReview({
        overrides: session.overrides ?? {},
        clinicianNotes,
        reportDraft: session.reportDraft ?? undefined,
      });
    },
    [persistReview, session.overrides, session.reportDraft],
  );

  const handleReportDraftChange = useCallback(
    (reportDraft: string) => {
      if (reportFinalized) return;
      setSession((prev) => ({ ...prev, reportDraft }));
      setPersistStatus("idle");
      persistReview({
        overrides: session.overrides ?? {},
        clinicianNotes: session.clinicianNotes ?? "",
        reportDraft,
      });
    },
    [persistReview, session.overrides, session.clinicianNotes, reportFinalized],
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
      <AssessmentReview
        answers={session.answers}
        clientName={session.clientName ?? undefined}
        initialOverrides={session.overrides ?? {}}
        initialNotes={session.clinicianNotes ?? ""}
        sessionId={session.id}
        initialReportDraft={session.reportDraft}
        reportGeneratedAt={session.reportGeneratedAt}
        reportFinalized={reportFinalized}
        onOverridesChange={handleOverridesChange}
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
