import type { IntakeAccessDenial } from "@/lib/intake-access";

const MESSAGES: Record<IntakeAccessDenial, { title: string; body: string }> = {
  not_found: {
    title: "Link not found",
    body: "This intake link is invalid. Contact your clinician for a new link.",
  },
  revoked: {
    title: "Link no longer available",
    body: "Your clinician has revoked this intake link. Contact them if you need a new one.",
  },
  expired: {
    title: "Link expired",
    body: "This intake link has expired. Contact your clinician for a new link.",
  },
  consent_required: {
    title: "Consent required",
    body: "Please accept the consent screen to continue.",
  },
};

export function IntakeBlocked({ reason }: { reason: IntakeAccessDenial }) {
  const { title, body } = MESSAGES[reason];
  return (
    <main className="mx-auto max-w-lg px-6 py-16 text-center">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      <p className="mt-3 text-gray-600">{body}</p>
    </main>
  );
}
