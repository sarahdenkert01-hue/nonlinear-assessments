import { BrandLogo } from "@/components/brand-logo";
import { HomeNav } from "./home-nav";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[var(--accent-soft)] to-transparent" />
      <main className="relative mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
        <BrandLogo href="/" size={56} showWordmark className="mb-6" />
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
          Clinical intake
        </p>
        <h1 className="ui-page-title mt-3">Assessments</h1>
        <p className="ui-page-lead max-w-md">
          Theme-based questionnaires for clients, with structured review and report
          drafting for clinicians.
        </p>
        <HomeNav />
      </main>
    </div>
  );
}
