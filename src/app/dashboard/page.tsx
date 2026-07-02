import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { ClinicianHeader } from "@/components/clinician-header";
import {
  StatusBadge,
  sessionStatusLabel,
  sessionStatusVariant,
} from "@/components/ui/status-badge";
import {
  listSessionsForClinician,
  type DashboardFilter,
} from "@/lib/episodes";
import { DashboardFilters } from "./dashboard-filters";
import { IntakeLinkCreator } from "./intake-link-creator";

type PageProps = {
  searchParams: Promise<{ filter?: string; q?: string }>;
};

function parseFilter(value: string | undefined): DashboardFilter {
  const allowed: DashboardFilter[] = [
    "all",
    "awaiting_client",
    "ready_to_review",
    "in_progress",
    "reviewed",
  ];
  if (value && allowed.includes(value as DashboardFilter)) {
    return value as DashboardFilter;
  }
  return "all";
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const params = await searchParams;
  const filter = parseFilter(params.filter);
  const search = params.q?.trim() ?? "";

  const sessions = await listSessionsForClinician(userId, {
    filter: filter === "all" ? undefined : filter,
    search: search || undefined,
  });

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <ClinicianHeader />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <header>
          <h1 className="ui-page-title">Dashboard</h1>
          <p className="ui-page-lead">
            Create intake links and track client progress through review.
          </p>
        </header>

        <section className="mt-8">
          <h2 className="ui-section-title">New intake</h2>
          <div className="mt-3">
            <IntakeLinkCreator />
          </div>
        </section>

        <section className="mt-12">
          <h2 className="ui-section-title">Assessment episodes</h2>
          <Suspense fallback={<p className="mt-4 text-sm text-slate-500">Loading…</p>}>
            <DashboardFilters currentFilter={filter} currentSearch={search} />
          </Suspense>

          {sessions.length === 0 ? (
            <EmptyState
              title={filter !== "all" || search ? "No matches" : "No episodes yet"}
              description={
                filter !== "all" || search
                  ? "Try a different filter or search term."
                  : "Create an intake link above and send it to your client."
              }
            />
          ) : (
            <ul className="mt-4 space-y-2">
              {sessions.map((s) => (
                <li key={s.id} className="ui-card transition-shadow hover:shadow-md">
                  <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/cases/${s.id}`}
                          className="font-medium text-slate-900 hover:underline"
                        >
                          {s.clientName ?? "Unnamed client"}
                        </Link>
                        <StatusBadge variant={sessionStatusVariant(s)}>
                          {sessionStatusLabel(s)}
                        </StatusBadge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {s.submittedAt &&
                          `Submitted ${new Date(s.submittedAt).toLocaleDateString()}`}
                        {s.reportFinalizedAt && " · Report finalized"}
                        {s.reportDraft && !s.reportFinalizedAt && " · Draft saved"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {!s.revokedAt && (
                        <Link
                          href={`/intake/${s.token}`}
                          className="ui-btn ui-btn-secondary px-3 py-1.5 text-xs"
                          target="_blank"
                        >
                          Intake link
                        </Link>
                      )}
                      {s.status !== "DRAFT" && (
                        <Link
                          href={`/cases/${s.id}/assessment`}
                          className="ui-btn ui-btn-primary px-3 py-1.5 text-xs"
                        >
                          Review
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
