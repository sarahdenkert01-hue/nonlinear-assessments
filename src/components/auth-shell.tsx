import { BrandLogo } from "@/components/brand-logo";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-[var(--accent-soft)] to-transparent dark:from-slate-800/50" />
      <main className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
        <div className="mb-8">
          <BrandLogo href="/" size={48} showWordmark />
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
          Clinician access
        </p>
        <h1 className="ui-page-title mt-2">{title}</h1>
        <p className="ui-page-lead">{subtitle}</p>
        <div className="mt-8 flex justify-center">{children}</div>
      </main>
    </div>
  );
}
