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
import {
  countConfirmedFindings,
  listDomainSummariesForEpisode,
} from "@/lib/domains";

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
  const confirmedFindingCount =
    episode.status !== "DRAFT" ? await countConfirmedFindings(id) : 0;
  const domainSummaries =
    episode.status !== "DRAFT" ? await listDomainSummariesForEpisode(id) : [];
  const domainsWithEvidence = domainSummaries.filter((d) => d.hasConfirmedFindings).length;
  const domainsReviewed = domainSummaries.filter((d) => d.reviewedAt).length;

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
          <h2 className="ui-section-title">Review workflow</h2>
          <ul className="mt-4 space-y-2">
            {episode.status !== "DRAFT" && (
              <>
                <li className="ui-card px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">1. Finding review</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Confirm or exclude theme-level findings from the screener.
                      </p>
                    </div>
                    <Link
                      href={`/cases/${episode.id}/assessment`}
                      className="ui-btn ui-btn-primary px-3 py-1.5 text-xs"
                    >
                      Review findings
                    </Link>
                  </div>
                </li>
                <li className="ui-card px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">2. Domain review</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {confirmedFindingCount > 0
                          ? `${confirmedFindingCount} confirmed finding${confirmedFindingCount === 1 ? "" : "s"} · ${domainsWithEvidence} domain${domainsWithEvidence === 1 ? "" : "s"} with evidence · ${domainsReviewed} reviewed`
                          : "Confirm findings first, then synthesize by clinical domain."}
                      </p>
                    </div>
                    <Link
                      href={`/cases/${episode.id}/domains`}
                      className={`ui-btn px-3 py-1.5 text-xs${confirmedFindingCount > 0 ? " ui-btn-secondary" : " ui-btn-ghost"}`}
                    >
                      Domain review
                    </Link>
                  </div>
                </li>
              </>
            )}
          </ul>
        </section>

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

        {episode.status !== "DRAFT" && (
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
          </section>
        )}
      </main>
    </div>
  );
}
