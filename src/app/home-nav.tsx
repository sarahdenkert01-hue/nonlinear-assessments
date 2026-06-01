"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-provider";

export function HomeNav() {
  return (
    <nav className="mt-10 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button type="button" className="ui-btn ui-btn-primary px-5 py-2.5">
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button type="button" className="ui-btn ui-btn-secondary px-5 py-2.5">
              Create account
            </button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </div>

      <Show when="signed-in">
        <Link href="/dashboard" className="ui-btn ui-btn-primary w-fit px-5 py-2.5">
          Go to dashboard
        </Link>
      </Show>

      <Show when="signed-out">
        <p className="max-w-sm text-sm leading-relaxed text-slate-500">
          Clinicians sign in to manage intake links and reviews. Clients use a private
          link from their clinician — no account required.
        </p>
      </Show>

      <div className="flex flex-wrap items-center gap-4">
        <ThemeToggle />
        {process.env.NODE_ENV === "development" && (
          <Link
            href="/dev/preview"
            className="w-fit text-sm text-[var(--muted)] underline-offset-2 hover:text-[var(--foreground)] hover:underline"
          >
            Dev preview (no sign-in)
          </Link>
        )}
      </div>
    </nav>
  );
}
