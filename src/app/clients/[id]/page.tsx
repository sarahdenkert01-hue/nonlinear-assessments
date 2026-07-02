import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { ClinicianHeader } from "@/components/clinician-header";
import { getClientForClinician, listSessionsForClient } from "@/lib/episodes";

type PageProps = { params: Promise<{ id: string }> };

export default async function ClientDetailPage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;
  const client = await getClientForClinician(id, userId);
  if (!client) notFound();

  const sessions = await listSessionsForClient(id, userId);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <ClinicianHeader title={client.displayName} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link href="/clients" className="text-sm text-gray-500 hover:text-gray-800">
          ← All clients
        </Link>
        <h1 className="mt-4 text-xl font-semibold text-gray-900">{client.displayName}</h1>
        {client.email && <p className="text-sm text-gray-600">{client.email}</p>}

        <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Assessment episodes
        </h2>
        {sessions.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No episodes linked yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>
                  {s.status}
                  {s.submittedAt &&
                    ` · ${new Date(s.submittedAt).toLocaleDateString()}`}
                </span>
                {s.status !== "DRAFT" && (
                  <Link
                    href={`/cases/${s.id}/assessment`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Review
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
