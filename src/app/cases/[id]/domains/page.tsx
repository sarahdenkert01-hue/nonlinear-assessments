import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { ClinicianHeader } from "@/components/clinician-header";
import { getSessionForClinician } from "@/lib/episodes";
import {
  countConfirmedFindings,
  listDomainSummariesForEpisode,
} from "@/lib/domains";
import { DomainHubClient } from "./domain-hub-client";

type PageProps = { params: Promise<{ id: string }> };

export default async function DomainHubPage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;
  const session = await getSessionForClinician(id, userId);
  if (!session) notFound();
  if (session.status === "DRAFT") redirect(`/cases/${id}`);

  const domains = await listDomainSummariesForEpisode(id);
  const confirmedFindingCount = await countConfirmedFindings(id);

  return (
    <div>
      <ClinicianHeader title="Domain review" />
      <DomainHubClient
        episodeId={id}
        clientName={session.clientName ?? undefined}
        domains={domains}
        confirmedFindingCount={confirmedFindingCount}
      />
    </div>
  );
}
