import { notFound } from "next/navigation";
import { getIntakeAccessDenial } from "@/lib/intake-access";
import { getSessionByToken } from "@/lib/sessions";
import { IntakeBlocked } from "./intake-blocked";
import { IntakeClient } from "./intake-client";

type PageProps = { params: Promise<{ token: string }> };

export default async function IntakePage({ params }: PageProps) {
  const { token } = await params;
  const session = await getSessionByToken(token);
  const denial = getIntakeAccessDenial(session);
  if (denial === "not_found") notFound();
  if (denial) return <IntakeBlocked reason={denial} />;
  return <IntakeClient session={session!} />;
}
