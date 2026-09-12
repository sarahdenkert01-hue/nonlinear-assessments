import { redirect } from "next/navigation";

/**
 * Public clinician self-registration is disabled for this single-clinician app.
 * Keep the route so bookmarks / Clerk env URLs do not 404; send people to sign-in.
 * Enforce invite-only / restricted sign-ups in the Clerk Dashboard as well.
 */
export default function SignUpPage() {
  redirect("/sign-in");
}
