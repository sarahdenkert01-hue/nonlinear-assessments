type SessionBadgeVariant =
  | "awaiting"
  | "in_progress"
  | "ready"
  | "report"
  | "reviewed"
  | "revoked";

const STYLES: Record<SessionBadgeVariant, string> = {
  awaiting: "bg-slate-100 text-slate-700",
  in_progress: "bg-sky-50 text-sky-800",
  ready: "bg-blue-50 text-blue-800",
  report: "bg-violet-50 text-violet-800",
  reviewed: "bg-emerald-50 text-emerald-800",
  revoked: "bg-amber-50 text-amber-800",
};

export function StatusBadge({
  variant,
  children,
}: {
  variant: SessionBadgeVariant;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[variant]}`}
    >
      {children}
    </span>
  );
}

export function sessionStatusVariant(session: {
  status: string;
  consentAcceptedAt: string | null;
  reportDraft: string | null;
  reportFinalizedAt?: string | null;
  revokedAt?: string | null;
}): SessionBadgeVariant {
  if (session.revokedAt) return "revoked";
  if (session.status === "REVIEWED") return "reviewed";
  if (session.status === "SUBMITTED") {
    if (session.reportFinalizedAt) return "reviewed";
    if (session.reportDraft) return "report";
    return "ready";
  }
  if (session.consentAcceptedAt) return "in_progress";
  return "awaiting";
}

export function sessionStatusLabel(session: {
  status: string;
  consentAcceptedAt: string | null;
  reportDraft: string | null;
  reportFinalizedAt?: string | null;
  revokedAt?: string | null;
}): string {
  const variant = sessionStatusVariant(session);
  switch (variant) {
    case "revoked":
      return "Link revoked";
    case "reviewed":
      return "Reviewed";
    case "report":
      return "Report in progress";
    case "ready":
      return "Ready to review";
    case "in_progress":
      return "Client in progress";
    default:
      return "Awaiting client";
  }
}
