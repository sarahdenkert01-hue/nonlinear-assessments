import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fafafa] px-4 py-16">
      <SignUp forceRedirectUrl="/dashboard" signInUrl="/sign-in" />
    </main>
  );
}
