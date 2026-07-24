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
  getClientModulesForClinician,
  getSessionForClinician,
  listModulesForEpisode,
  type ModuleSummary,
} from "@/lib/episodes";
import {
  MODULE_KEYS,
  buildExplorationReportContext,
  getDefaultClientModules,
} from "@/lib/modules";
import {
  countConfirmedFindings,
  listDomainSummariesForEpisode,
} from "@/lib/domains";
import { AddExplorationsButton } from "./add-explorations-button";

type PageProps = { params: Promise<{ id: string }> };

const MODULE_STATUS_LABELS: Record<ModuleSummary["status"], string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  COMPLETED: "Completed",
};

function actionLabel(status: ModuleSummary["status"]): string {
  if (status === "SUBMITTED" || status === "COMPLETED") return "Review";
  if (status === "IN_PROGRESS") return "View draft";
  return "View";
}

export default async function EpisodeOverviewPage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;
  const episode = await getSessionForClinician(id, userId);
  if (!episode) notFound();

  const modules = (await listModulesForEpisode(id, userId)) ?? [];
  const clientModules = (await getClientModulesForClinician(id, userId)) ?? [];
  const explorationContext = buildExplorationReportContext(clientModules);
  const defaultKeys = new Set(getDefaultClientModules().map((m) => m.moduleKey));
  const missingExplorations = [...defaultKeys].some(
    (key) =>
      key !== MODULE_KEYS.SCREENER && !modules.some((m) => m.moduleKey === key),
  );

  const confirmedFindingCount =
    episode.status !== "DRAFT" ? await countConfirmedFindings(id) : 0;
  const domainSummaries =
    episode.status !== "DRAFT" ? await listDomainSummariesForEpisode(id) : [];
  const domainsWithEvidence = domainSummaries.filter((d) => d.hasConfirmedFindings).length;
  const domainsReviewed = domainSummaries.filter((d) => d.reviewedAt).length;

  const screener = modules.find((m) => m.moduleKey === MODULE_KEYS.SCREENER);
  const screenerSubmitted =
    screener?.status === "SUBMITTED" || screener?.status === "COMPLETED";
  const allClientSubmitted = clientModules
    .filter((m) => m.required)
    .every((m) => m.status === "SUBMITTED" || m.status === "COMPLETED");

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
        {allClientSubmitted && episode.status !== "REVIEWED" && (
          <p className="mt-2 text-sm text-emerald-700">
            All required client activities are submitted. You can continue clinical review
            and mark the episode reviewed when ready.
          </p>
        )}

        <section className="mt-8">
          <h2 className="ui-section-title">Client activities</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-3 font-medium">Activity</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Submitted</th>
                  <th className="py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {modules
                  .filter((m) => m.audience === "CLIENT")
                  .map((m) => (
                    <tr key={m.id} className="border-b border-slate-100">
                      <td className="py-3 pr-3 font-medium text-slate-900">{m.title}</td>
                      <td className="py-3 pr-3 text-slate-600">
                        {MODULE_STATUS_LABELS[m.status]}
                      </td>
                      <td className="py-3 pr-3 text-slate-500">
                        {m.submittedAt
                          ? new Date(m.submittedAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="py-3">
                        <Link
                          href={`/cases/${episode.id}/modules/${m.moduleKey}`}
                          className="ui-btn ui-btn-ghost px-2 py-1 text-xs"
                        >
                          {actionLabel(m.status)}
                        </Link>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {missingExplorations && (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm text-amber-900">
                This episode was created before the multi-module journey. Only existing
                modules are shown. You can add Developmental Life Map and Guided Reflection
                without changing historical responses.
              </p>
              <div className="mt-3">
                <AddExplorationsButton episodeId={episode.id} />
              </div>
            </div>
          )}
          {(explorationContext.developmentalLifeMap ||
            explorationContext.guidedReflection) && (
            <p className="mt-3 text-xs text-slate-500">
              Submitted explorations are available as client-report context for future
              report generation.
            </p>
          )}
        </section>

        <section className="mt-8">
          <h2 className="ui-section-title">Review workflow</h2>
          <ul className="mt-4 space-y-2">
            {(episode.status !== "DRAFT" || screenerSubmitted) && (
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
            {episode.status === "DRAFT" && !screenerSubmitted && (
              <li className="ui-card px-4 py-4 text-sm text-slate-600">
                Clinical review unlocks after the client submits the initial assessment.
                Exploration modules can still be reviewed individually as they arrive.
              </li>
            )}
          </ul>
        </section>

        {episode.token && !episode.revokedAt && (
          <section className="mt-8 flex flex-wrap gap-2">
            <Link
              href={`/intake/${episode.token}`}
              target="_blank"
              className="ui-btn ui-btn-secondary px-3 py-1.5 text-xs"
            >
              Open client journey link
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}
