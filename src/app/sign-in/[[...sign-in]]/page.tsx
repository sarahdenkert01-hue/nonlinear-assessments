import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth-shell";

export default function SignInPage() {
  return (
    <AuthShell
      title="Sign in"
      subtitle="Access your dashboard to manage intake links and client reviews."
    >
      <SignIn
        forceRedirectUrl="/dashboard"
        withSignUp={false}
        appearance={{
          elements: {
            // Hide "Don't have an account? Sign up" even if instance still allows sign-ups.
            footerAction: { display: "none" },
          },
        }}
      />
    </AuthShell>
  );
}
