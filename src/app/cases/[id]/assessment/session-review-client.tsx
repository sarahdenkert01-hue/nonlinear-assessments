"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  ReportPanel,
  requestSessionReport,
  type AssessmentReportResult,
} from "@/features/assessments";
import { useDebouncedCallback } from "@/lib/hooks/useDebouncedCallback";
import { parseApiResponse } from "@/lib/parse-api-response";
import type { AssessmentSessionRecord, EpisodeResponseReview } from "@/lib/episodes";
import type { FindingRecord } from "@/lib/findings/types";
import {
  StatusBadge,
  sessionStatusLabel,
  sessionStatusVariant,
} from "@/components/ui/status-badge";
import { FindingsReview } from "./findings-review";
import { ResponseReviewPanel } from "./response-review-panel";
import { SessionAuditLog } from "./session-audit-log";
import { SessionLinkControls } from "./session-link-controls";
import "@/features/assessments/components/assessment.css";

type PersistStatus = "idle" | "saving" | "saved" | "error";
type ReviewTab = "responses" | "findings" | "report";

export function SessionAssessmentReview({
  session: initialSession,
  findings,
  responseReview,
}: {
  session: AssessmentSessionRecord;
  findings: FindingRecord[];
  responseReview: EpisodeResponseReview;
}) {
  const [session, setSession] = useState(initialSession);
  const [persistStatus, setPersistStatus] = useState<PersistStatus>("idle");
  const [markingReviewed, setMarkingReviewed] = useState(false);
  const [tab, setTab] = useState<ReviewTab>("responses");
  const reportFinalized = Boolean(session.reportFinalizedAt);

  const confirmedFindingCount = useMemo(
    () => findings.filter((f) => f.status === "ACCEPTED" || f.status === "EDITED").length,
    [findings],
  );

  const includedFindingCount = useMemo(
    () => findings.filter((f) => f.status !== "EXCLUDED").length,
    [findings],
  );

  const screenerAnsweredCount = useMemo(() => {
    const screener = responseReview.modules.find((m) => m.moduleKey === "nonlinear-screener");
    return screener?.answeredCount ?? Object.keys(session.answers ?? {}).length;
  }, [responseReview.modules, session.answers]);

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

  const handleGenerate = ({ narrativeOnly }: { narrativeOnly: boolean }) =>
    requestSessionReport(session.id, {
      overrides: {},
      clinicianNotes: session.clinicianNotes?.trim() || undefined,
      narrativeOnly,
    });

  const tabs: { id: ReviewTab; label: string }[] = [
    { id: "responses", label: "Responses" },
    { id: "findings", label: "Clinical Findings" },
    { id: "report", label: "Report" },
  ];

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
            <Link href={`/cases/${session.id}`} className="ui-btn ui-btn-ghost px-2 py-1 text-xs">
              ← Episode
            </Link>
            <Link href="/dashboard" className="ui-btn ui-btn-ghost px-2 py-1 text-xs">
              Dashboard
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

      <div className="border-b border-[var(--border)] bg-white px-6">
        <div
          className="mx-auto flex max-w-5xl gap-1"
          role="tablist"
          aria-label="Review sections"
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "border-[var(--foreground)] text-[var(--foreground)]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {confirmedFindingCount > 0 && tab === "findings" && (
        <div className="border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--accent)_35%,var(--surface))] px-6 py-3">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-[var(--muted)]">
              <strong className="text-[var(--foreground)]">{confirmedFindingCount}</strong> finding
              {confirmedFindingCount === 1 ? "" : "s"} confirmed — ready for domain synthesis.
            </span>
            <Link
              href={`/cases/${session.id}/domains`}
              className="ui-btn ui-btn-primary px-3 py-1.5 text-xs"
            >
              Continue to domain review →
            </Link>
          </div>
        </div>
      )}

      {tab === "responses" && <ResponseReviewPanel review={responseReview} />}

      {tab === "findings" && (
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
          showReportSection={false}
          screenerAnsweredCount={screenerAnsweredCount}
        />
      )}

      {tab === "report" && (
        <div className="assessment-root">
          <div className="assessment-shell assessment-shell--wide py-8">
            <ReportPanel
              canGenerate={includedFindingCount > 0}
              sessionId={session.id}
              initialReportDraft={session.reportDraft}
              reportGeneratedAt={session.reportGeneratedAt}
              reportFinalized={reportFinalized}
              onGenerate={handleGenerate}
              onReportDraftChange={handleReportDraftChange}
              onReportGenerated={(report: AssessmentReportResult) => {
                setSession((prev) => ({
                  ...prev,
                  reportDraft: report.draft,
                  reportGeneratedAt: report.generatedAt,
                }));
              }}
              onFinalizeReport={handleFinalizeReport}
              onExportReport={handleExportReport}
            />
          </div>
        </div>
      )}

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
