import { notFound } from "next/navigation";
import {
  DevelopmentalLifeMapModule,
  GuidedReflectionModule,
  ScreenerModule,
} from "@/features/journey";
import { getIntakeAccessDenial, hasConsent } from "@/lib/intake-access";
import {
  getModuleByTokenAndKey,
  getSessionByToken,
} from "@/lib/episodes";
import { MODULE_KEYS, getModuleDefinition } from "@/lib/modules";
import { IntakeBlocked } from "../../intake-blocked";
import {
  IntakeUnavailable,
  isDatabaseConnectivityError,
} from "../../intake-unavailable";
import { IntakeConsentRedirect } from "./consent-redirect";

type PageProps = { params: Promise<{ token: string; moduleKey: string }> };

export default async function IntakeModulePage({ params }: PageProps) {
  const { token, moduleKey } = await params;

  try {
    const session = await getSessionByToken(token);
    const denial = getIntakeAccessDenial(session);
    if (denial === "not_found") notFound();
    if (denial) return <IntakeBlocked reason={denial} />;

    if (!hasConsent(session!)) {
      return <IntakeConsentRedirect token={token} />;
    }

    const def = getModuleDefinition(moduleKey);
    const moduleRecord = await getModuleByTokenAndKey(token, moduleKey);
    if (!moduleRecord) notFound();

    if (moduleKey === MODULE_KEYS.SCREENER || def?.renderer === "assessment-form") {
      return <ScreenerModule token={token} module={moduleRecord} />;
    }
    if (moduleKey === MODULE_KEYS.LIFE_MAP || def?.renderer === "developmental-life-map") {
      return <DevelopmentalLifeMapModule token={token} module={moduleRecord} />;
    }
    if (
      moduleKey === MODULE_KEYS.GUIDED_REFLECTION ||
      def?.renderer === "guided-reflection"
    ) {
      return <GuidedReflectionModule token={token} module={moduleRecord} />;
    }

    notFound();
  } catch (err) {
    const isDb = isDatabaseConnectivityError(err);
    console.error("[intake/module] failed to load", isDb ? "database_unreachable" : "unexpected");
    return <IntakeUnavailable reason={isDb ? "database" : "unexpected"} />;
  }
}
