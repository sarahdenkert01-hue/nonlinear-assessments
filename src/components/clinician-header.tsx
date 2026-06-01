"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-provider";

interface ClinicianHeaderProps {
  title?: string;
  children?: React.ReactNode;
}

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
] as const;

export function ClinicianHeader({ title, children }: ClinicianHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-5">
          <BrandLogo href="/dashboard" size={32} showWordmark />
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
            {NAV.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    active
                      ? "rounded-md bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--accent)]"
                      : "rounded-md px-2.5 py-1 text-xs font-medium text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] hover:text-[var(--foreground)]"
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          {title && (
            <>
              <span className="hidden text-slate-300 sm:inline" aria-hidden>
                /
              </span>
              <span className="truncate text-xs font-medium text-slate-500">{title}</span>
            </>
          )}
          {children}
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />
          <UserButton />
        </div>
      </div>
    </header>
  );
}
