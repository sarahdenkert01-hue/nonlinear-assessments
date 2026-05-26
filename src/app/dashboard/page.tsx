import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ClinicianHeader } from "@/components/clinician-header";
import {
  listSessionsForClinician,
  type DashboardFilter,
} from "@/lib/sessions";
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
    <div className="min-h-screen bg-[#fafafa]">
      <ClinicianHeader title="Dashboard" />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <section>
          <h1 className="text-xl font-semibold text-gray-900">Assessments</h1>
          <p className="mt-1 text-sm text-gray-600">
            Create intake links for clients and review submitted questionnaires.
          </p>
          <div className="mt-6">
            <IntakeLinkCreator />
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Your sessions
          </h2>
          <Suspense fallback={<p className="mt-4 text-sm text-gray-500">Loading filters…</p>}>
            <DashboardFilters currentFilter={filter} currentSearch={search} />
          </Suspense>
          {sessions.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              {filter !== "all" || search
                ? "No sessions match this filter."
                : "No intake sessions yet."}
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
              {sessions.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">
                      {s.clientName ?? "Unnamed client"}
                    </p>
                    <p className="text-xs text-gray-500">
                      <SessionStatusLabel session={s} />
                      {s.submittedAt &&
                        ` · Submitted ${new Date(s.submittedAt).toLocaleDateString()}`}
                      {s.reportFinalizedAt && " · Report finalized"}
                      {s.reportDraft && !s.reportFinalizedAt && " · Report drafted"}
                      {s.revokedAt && " · Link revoked"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-3 text-sm">
                    {!s.revokedAt && (
                      <Link
                        href={`/intake/${s.token}`}
                        className="text-gray-500 hover:text-gray-800"
                        target="_blank"
                      >
                        Intake
                      </Link>
                    )}
                    {s.status !== "DRAFT" && (
                      <Link
                        href={`/cases/${s.id}/assessment`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Review
                      </Link>
                    )}
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

function SessionStatusLabel({
  session,
}: {
  session: {
    status: string;
    consentAcceptedAt: string | null;
    reportDraft: string | null;
  };
}) {
  if (session.status === "REVIEWED") {
    return <span className="text-green-700">Reviewed</span>;
  }
  if (session.status === "SUBMITTED") {
    return (
      <span className="text-blue-700">
        {session.reportDraft ? "Report in progress" : "Ready to review"}
      </span>
    );
  }
  return (
    <span>
      {session.consentAcceptedAt ? "In progress" : "Awaiting client"}
    </span>
  );
}
