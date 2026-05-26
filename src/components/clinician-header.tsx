import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

interface ClinicianHeaderProps {
  title?: string;
  children?: React.ReactNode;
}

export function ClinicianHeader({ title, children }: ClinicianHeaderProps) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/dashboard" className="text-sm font-semibold text-gray-900">
            Nonlinear
          </Link>
          <nav className="hidden gap-4 sm:flex">
            <Link href="/dashboard" className="text-xs text-gray-500 hover:text-gray-800">
              Dashboard
            </Link>
            <Link href="/clients" className="text-xs text-gray-500 hover:text-gray-800">
              Clients
            </Link>
          </nav>
          {title && (
            <span className="truncate text-xs font-medium uppercase tracking-wide text-gray-400">
              {title}
            </span>
          )}
          {children}
        </div>
        <UserButton />
      </div>
    </header>
  );
}
