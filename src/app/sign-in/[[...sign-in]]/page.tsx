import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fafafa] px-4 py-16">
      <SignIn forceRedirectUrl="/dashboard" signUpUrl="/sign-up" />
    </main>
  );
}
