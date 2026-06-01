import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth-shell";

export default function SignInPage() {
  return (
    <AuthShell
      title="Sign in"
      subtitle="Access your dashboard to manage intake links and client reviews."
    >
      <SignIn forceRedirectUrl="/dashboard" signUpUrl="/sign-up" />
    </AuthShell>
  );
}
