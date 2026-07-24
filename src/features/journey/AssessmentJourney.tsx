"use client";

import Link from "next/link";
import { MODULE_KEYS, type ClientAssessmentEpisode, type ClientModuleRecord } from "@/lib/modules";

const STATUS_LABELS: Record<ClientModuleRecord["status"], string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  COMPLETED: "Completed",
};

function actionLabel(status: ClientModuleRecord["status"]): string {
  switch (status) {
    case "NOT_STARTED":
      return "Begin";
    case "IN_PROGRESS":
      return "Continue";
    case "SUBMITTED":
    case "COMPLETED":
      return "Review";
    default:
      return "Open";
  }
}

function statusTone(status: ClientModuleRecord["status"]): string {
  switch (status) {
    case "SUBMITTED":
    case "COMPLETED":
      return "text-emerald-700 bg-emerald-50";
    case "IN_PROGRESS":
      return "text-amber-800 bg-amber-50";
    default:
      return "text-slate-600 bg-slate-100";
  }
}

function isSubmitted(status: ClientModuleRecord["status"]): boolean {
  return status === "SUBMITTED" || status === "COMPLETED";
}

export function AssessmentJourney({
  episode,
  token,
}: {
  episode: ClientAssessmentEpisode;
  token: string;
}) {
  const screener = episode.modules.find((m) => m.moduleKey === MODULE_KEYS.SCREENER);
  const screenerSubmitted = screener ? isSubmitted(screener.status) : false;
  const clinicianReviewed = episode.status === "REVIEWED";
  const remainingCount = episode.modules.filter((m) => m.required && !isSubmitted(m.status))
    .length;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8">
        <h1 className="ui-page-title">Your Assessment Journey</h1>
        <p className="ui-page-lead mt-2">
          These activities help us understand your experiences from several different
          perspectives. You can pause and return using the same secure link.
        </p>
        {episode.clientName && (
          <p className="mt-3 text-sm text-[var(--muted)]">Prepared for {episode.clientName}</p>
        )}
      </header>

      {clinicianReviewed ? (
        <p
          className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          role="status"
        >
          Your clinician has completed their review of this assessment. You can still revisit
          any activity you submitted.
        </p>
      ) : episode.allRequiredSubmitted ? (
        <p
          className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          role="status"
        >
          You have completed all of the activities in this journey. Thank you for sharing —
          your clinician can review each activity when they are ready.
        </p>
      ) : screenerSubmitted ? (
        <p
          className="mb-6 rounded-md border border-[var(--border)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent-foreground)]"
          role="status"
        >
          Your initial assessment has been submitted. Continue with the remaining activities
          below whenever you are ready
          {remainingCount > 0 ? ` (${remainingCount} still open)` : ""}.
        </p>
      ) : null}

      <ul className="space-y-4">
        {episode.modules.map((mod) => (
          <li key={mod.moduleKey} className="ui-card px-5 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-slate-900">{mod.title}</h2>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${statusTone(mod.status)}`}
                  >
                    {STATUS_LABELS[mod.status]}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{mod.description}</p>
                <p className="mt-2 text-xs text-slate-500">
                  About {mod.estimatedMinutes} minutes
                  {mod.submittedAt
                    ? ` · Submitted ${new Date(mod.submittedAt).toLocaleDateString()}`
                    : null}
                </p>
              </div>
              <Link
                href={`/intake/${token}/modules/${mod.moduleKey}`}
                className={
                  isSubmitted(mod.status)
                    ? "ui-btn ui-btn-secondary shrink-0"
                    : "ui-btn ui-btn-primary shrink-0"
                }
              >
                {actionLabel(mod.status)}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
