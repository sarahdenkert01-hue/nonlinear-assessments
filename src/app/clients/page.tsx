import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ClinicianHeader } from "@/components/clinician-header";
import { listClientsForClinician } from "@/lib/sessions";
import { ClientCreator } from "./client-creator";

export default async function ClientsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const clients = await listClientsForClinician(userId);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <ClinicianHeader title="Clients" />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-xl font-semibold text-gray-900">Clients</h1>
        <p className="mt-1 text-sm text-gray-600">
          Reuse client records across multiple intake sessions.
        </p>
        <div className="mt-6">
          <ClientCreator />
        </div>
        {clients.length === 0 ? (
          <p className="mt-8 text-sm text-gray-500">No clients yet.</p>
        ) : (
          <ul className="mt-8 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
            {clients.map((c) => (
              <li key={c.id} className="px-4 py-3">
                <Link
                  href={`/clients/${c.id}`}
                  className="font-medium text-gray-900 hover:text-blue-700"
                >
                  {c.displayName}
                </Link>
                {c.email && (
                  <p className="text-xs text-gray-500">{c.email}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
