"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export function HomeNav() {
  return (
    <nav className="mt-8 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button
              type="button"
              className="inline-flex rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button
              type="button"
              className="inline-flex rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Sign up
            </button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </div>

      <Show when="signed-in">
        <Link
          href="/dashboard"
          className="inline-flex w-fit rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Go to dashboard
        </Link>
      </Show>

      <Show when="signed-out">
        <p className="text-sm text-gray-500">
          Clinicians sign in or create an account. Clients use the intake link from
          their clinician — no account needed.
        </p>
      </Show>

      {process.env.NODE_ENV === "development" && (
        <Link
          href="/dev/preview"
          className="inline-flex w-fit text-sm text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline"
        >
          Dev preview (no sign-in)
        </Link>
      )}
    </nav>
  );
}
