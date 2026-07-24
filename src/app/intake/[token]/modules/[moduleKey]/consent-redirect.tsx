"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Send clients without consent back to the journey root (consent gate). */
export function IntakeConsentRedirect({ token }: { token: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/intake/${token}`);
  }, [router, token]);
  return (
    <p className="px-6 py-10 text-sm text-slate-500">Redirecting to consent…</p>
  );
}
