import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { ClinicianHeader } from "@/components/clinician-header";
import {
  StatusBadge,
  sessionStatusLabel,
  sessionStatusVariant,
} from "@/components/ui/status-badge";
import {
  getSessionForClinician,
  listModulesForEpisode,
  type ModuleSummary,
} from "@/lib/episodes";

type PageProps = { params: Promise<{ id: string }> };

const MODULE_LABELS: Record<string, string> = {
  "nonlinear-screener": "Nonlinear screener",
};

const MODULE_STATUS_LABELS: Record<ModuleSummary["status"], string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  COMPLETED: "Completed",
};

export default async function EpisodeOverviewPage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;
  const episode = await getSessionForClinician(id, userId);
  if (!episode) notFound();

  const modules = (await listModulesForEpisode(id, userId)) ?? [];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <ClinicianHeader title="Episode" />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link href="/dashboard" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
          ← Dashboard
        </Link>

        <header className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="ui-page-title">{episode.clientName ?? "Unnamed client"}</h1>
          <StatusBadge variant={sessionStatusVariant(episode)}>
            {sessionStatusLabel(episode)}
          </StatusBadge>
        </header>
        <p className="ui-page-lead mt-1">Assessment episode overview.</p>

        <section className="mt-8">
          <h2 className="ui-section-title">Modules</h2>
          <ul className="mt-4 space-y-2">
            {modules.map((m) => (
              <li key={m.id} className="ui-card px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {MODULE_LABELS[m.moduleKey] ?? m.moduleKey}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {m.audience === "CLIENT" ? "Client-facing" : "Clinician-facing"} ·{" "}
                      {MODULE_STATUS_LABELS[m.status]} · {m.answeredCount} answered
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 flex flex-wrap gap-2">
          {!episode.revokedAt && episode.token && (
            <Link
              href={`/intake/${episode.token}`}
              target="_blank"
              className="ui-btn ui-btn-secondary px-3 py-1.5 text-xs"
            >
              Open intake link
            </Link>
          )}
          {episode.status !== "DRAFT" && (
            <Link
              href={`/cases/${episode.id}/assessment`}
              className="ui-btn ui-btn-primary px-3 py-1.5 text-xs"
            >
              Review
            </Link>
          )}
        </section>
      </main>
    </div>
  );
}
