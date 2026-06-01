"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { DashboardFilter } from "@/lib/sessions";

const FILTERS: { value: DashboardFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "awaiting_client", label: "Awaiting client" },
  { value: "ready_to_review", label: "Ready to review" },
  { value: "in_progress", label: "Report in progress" },
  { value: "reviewed", label: "Reviewed" },
];

export function DashboardFilters({
  currentFilter,
  currentSearch,
}: {
  currentFilter: DashboardFilter;
  currentSearch: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    router.push(qs ? `/dashboard?${qs}` : "/dashboard");
  };

  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter sessions">
        {FILTERS.map((f) => {
          const active = currentFilter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => updateParams({ filter: f.value === "all" ? null : f.value })}
              className={
                active
                  ? "rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-medium text-[var(--accent-foreground)] shadow-sm"
                  : "rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }
            >
              {f.label}
            </button>
          );
        })}
      </div>
      <input
        type="search"
        placeholder="Search clients…"
        defaultValue={currentSearch}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            updateParams({ q: (e.target as HTMLInputElement).value.trim() || null });
          }
        }}
        onBlur={(e) => {
          const next = e.target.value.trim();
          if (next !== currentSearch) {
            updateParams({ q: next || null });
          }
        }}
        className="ui-input sm:max-w-xs"
        aria-label="Search sessions by client name"
      />
    </div>
  );
}
