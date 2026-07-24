import { notFound } from "next/navigation";
import { getIntakeAccessDenial } from "@/lib/intake-access";
import { getClientEpisodeByToken, getSessionByToken } from "@/lib/episodes";
import { IntakeBlocked } from "./intake-blocked";
import { IntakeClient } from "./intake-client";
import {
  IntakeUnavailable,
  isDatabaseConnectivityError,
} from "./intake-unavailable";

type PageProps = { params: Promise<{ token: string }> };

export default async function IntakePage({ params }: PageProps) {
  const { token } = await params;

  try {
    const session = await getSessionByToken(token);
    const denial = getIntakeAccessDenial(session);
    if (denial === "not_found") notFound();
    if (denial) return <IntakeBlocked reason={denial} />;

    const episode = await getClientEpisodeByToken(token);
    if (!episode) notFound();

    return <IntakeClient session={session!} episode={episode} />;
  } catch (err) {
    const isDb = isDatabaseConnectivityError(err);
    console.error("[intake] failed to load episode", isDb ? "database_unreachable" : "unexpected");
    return <IntakeUnavailable reason={isDb ? "database" : "unexpected"} />;
  }
}
