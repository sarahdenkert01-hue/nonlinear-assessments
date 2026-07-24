"use client";

import { useState } from "react";
import { AssessmentJourney } from "@/features/journey";
import { hasConsent } from "@/lib/intake-access";
import type { AssessmentSessionRecord } from "@/lib/episodes";
import type { ClientAssessmentEpisode } from "@/lib/modules";
import { IntakeConsent } from "./intake-consent";

export function IntakeClient({
  session: initialSession,
  episode: initialEpisode,
}: {
  session: AssessmentSessionRecord;
  episode: ClientAssessmentEpisode;
}) {
  const [session, setSession] = useState(initialSession);
  const [episode, setEpisode] = useState(initialEpisode);

  if (!hasConsent(session)) {
    return (
      <IntakeConsent
        session={session}
        onAccepted={async (updated) => {
          setSession(updated);
          // Refresh journey modules after consent.
          try {
            const res = await fetch(`/api/intake/${updated.token}/modules`);
            if (res.ok) {
              const data = await res.json();
              setEpisode(data.episode);
            }
          } catch {
            // Journey still usable with server-rendered episode after refresh.
          }
        }}
      />
    );
  }

  return <AssessmentJourney episode={episode} token={session.token} />;
}
