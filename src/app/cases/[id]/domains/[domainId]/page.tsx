import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { ClinicianHeader } from "@/components/clinician-header";
import { getSessionForClinician } from "@/lib/episodes";
import { getDomainById, getDomainDetailForEpisode } from "@/lib/domains";
import { DomainWorkspaceClient } from "./domain-workspace-client";

type PageProps = { params: Promise<{ id: string; domainId: string }> };

export default async function DomainWorkspacePage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id, domainId } = await params;
  const session = await getSessionForClinician(id, userId);
  if (!session) notFound();
  if (session.status === "DRAFT") redirect(`/cases/${id}`);
  if (!getDomainById(domainId)) notFound();

  const domain = await getDomainDetailForEpisode(id, domainId);
  if (!domain) notFound();

  return (
    <div>
      <ClinicianHeader title={domain.label} />
      <DomainWorkspaceClient episodeId={id} initialDomain={domain} />
    </div>
  );
}
