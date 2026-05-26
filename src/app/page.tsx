import { HomeNav } from "./home-nav";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
        Nonlinear Assessments
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-gray-600">
        Clinical intake with theme-based scoring and clinician review.
      </p>
      <HomeNav />
    </main>
  );
}
