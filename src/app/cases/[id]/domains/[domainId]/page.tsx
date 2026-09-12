import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { ClinicianHeader } from "@/components/clinician-header";
import { resolveQ62AcquiredEfContext } from "@/features/assessments/lib/q62-context";
import {
  getEpisodeResponseReviewForClinician,
  getSessionForClinician,
} from "@/lib/episodes";
import { getDomainById, getDomainDetailForEpisode, listDomainSummariesForEpisode } from "@/lib/domains";
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

  const [domain, allDomains, responseReview] = await Promise.all([
    getDomainDetailForEpisode(id, domainId),
    listDomainSummariesForEpisode(id),
    domainId === "executive-function"
      ? getEpisodeResponseReviewForClinician(id, userId)
      : Promise.resolve(null),
  ]);
  if (!domain) notFound();

  let acquiredEfContext = null;
  if (domainId === "executive-function" && responseReview) {
    const screener = responseReview.modules.find((m) => m.moduleKey === "nonlinear-screener");
    const q62 = screener?.items.find((i) => i.itemId === "q62");
    acquiredEfContext = resolveQ62AcquiredEfContext(q62?.answer);
  }

  return (
    <div>
      <ClinicianHeader title={domain.label} />
      <DomainWorkspaceClient
        episodeId={id}
        initialDomain={domain}
        allDomains={allDomains}
        acquiredEfContext={acquiredEfContext}
      />
    </div>
  );
}
