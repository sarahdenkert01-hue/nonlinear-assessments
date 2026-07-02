import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { ClinicianHeader } from "@/components/clinician-header";
import { listClientsForClinician } from "@/lib/episodes";
import { ClientCreator } from "./client-creator";

export default async function ClientsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const clients = await listClientsForClinician(userId);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <ClinicianHeader />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="ui-page-title">Clients</h1>
        <p className="ui-page-lead">Reuse client records across multiple intake sessions.</p>
        <div className="mt-8">
          <ClientCreator />
        </div>
        {clients.length === 0 ? (
          <EmptyState
            title="No clients yet"
            description="Add a client to link future intake sessions to the same record."
          />
        ) : (
          <ul className="mt-8 space-y-2">
            {clients.map((c) => (
              <li key={c.id} className="ui-card px-4 py-3 transition-shadow hover:shadow-md">
                <Link
                  href={`/clients/${c.id}`}
                  className="font-medium text-slate-900 hover:text-[var(--accent)]"
                >
                  {c.displayName}
                </Link>
                {c.email && <p className="mt-0.5 text-xs text-slate-500">{c.email}</p>}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
