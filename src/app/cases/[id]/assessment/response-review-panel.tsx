"use client";

import type { EpisodeResponseReview } from "@/lib/episodes";

const STATUS_LABELS: Record<
  EpisodeResponseReview["modules"][number]["status"],
  string
> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  COMPLETED: "Completed",
};

export function ResponseReviewPanel({
  review,
}: {
  review: EpisodeResponseReview;
}) {
  if (review.modules.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-sm text-[var(--muted)]">No client modules on this episode.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Client responses</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {review.submittedModuleCount} submitted module
          {review.submittedModuleCount === 1 ? "" : "s"} · {review.totalResponses} stored
          response row{review.totalResponses === 1 ? "" : "s"}. Client-reported content — not
          verified clinical conclusions.
        </p>
      </header>

      <div className="space-y-8">
        {review.modules.map((mod) => (
          <section key={mod.moduleKey} className="ui-card overflow-hidden">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold text-[var(--foreground)]">{mod.title}</h3>
                <p className="text-xs text-[var(--muted)]">
                  {STATUS_LABELS[mod.status]}
                  {mod.submittedAt
                    ? ` · ${new Date(mod.submittedAt).toLocaleString()}`
                    : ""}
                  {" · "}
                  {mod.answeredCount}/{mod.totalPromptCount} answered
                </p>
              </div>
            </div>

            {mod.items.length === 0 ? (
              <p className="px-5 py-4 text-sm text-[var(--muted)]">No prompts for this module.</p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {mod.items.map((item) => (
                  <li key={item.itemId} className="px-5 py-4">
                    <p className="whitespace-pre-wrap text-sm font-medium text-[var(--foreground)]">
                      {item.prompt}
                    </p>
                    {item.unanswered ? (
                      <p className="mt-2 text-sm italic text-[var(--muted)]">Unanswered</p>
                    ) : (
                      <p
                        className={`mt-2 text-sm text-slate-700 ${
                          item.multiline ? "whitespace-pre-wrap" : ""
                        }`}
                      >
                        {item.answer}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
