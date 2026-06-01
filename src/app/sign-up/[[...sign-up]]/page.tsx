import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth-shell";

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create account"
      subtitle="Register as a clinician to create intake links and review assessments."
    >
      <SignUp forceRedirectUrl="/dashboard" signInUrl="/sign-in" />
    </AuthShell>
  );
}
