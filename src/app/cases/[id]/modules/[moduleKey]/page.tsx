import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { CatQResults, type CatQAnswers } from "@/features/cat-q";
import {
  GUIDED_REFLECTION_SECTIONS,
  MODULE_KEYS,
  parseGuidedReflectionData,
  parseLifeMapData,
} from "@/lib/modules";
import { getModuleForClinician, getSessionForClinician } from "@/lib/episodes";
import { ClinicianHeader } from "@/components/clinician-header";

type PageProps = { params: Promise<{ id: string; moduleKey: string }> };

const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  COMPLETED: "Completed",
};

function parseCatQAnswers(data: unknown): CatQAnswers {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const answers: CatQAnswers = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 7) {
      answers[key] = value as CatQAnswers[string];
    } else if (typeof value === "string" && value.trim() !== "") {
      const n = Number(value);
      if (Number.isInteger(n) && n >= 1 && n <= 7) {
        answers[key] = n as CatQAnswers[string];
      }
    }
  }
  return answers;
}

export default async function ClinicianModuleReviewPage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id, moduleKey } = await params;
  const episode = await getSessionForClinician(id, userId);
  if (!episode) notFound();

  const mod = await getModuleForClinician(id, userId, moduleKey);
  if (!mod) notFound();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <ClinicianHeader title="Module review" />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link
          href={`/cases/${episode.id}`}
          className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          ← Episode overview
        </Link>

        {moduleKey !== MODULE_KEYS.CAT_Q && (
          <header className="mt-4">
            <h1 className="ui-page-title">{mod.title}</h1>
            <p className="ui-page-lead mt-1">
              {STATUS_LABELS[mod.status] ?? mod.status}
              {mod.submittedAt
                ? ` · Submitted ${new Date(mod.submittedAt).toLocaleString()}`
                : ""}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Client-reported content — not verified clinical conclusions.
            </p>
          </header>
        )}

        {moduleKey === MODULE_KEYS.SCREENER && (
          <section className="mt-8">
            <p className="text-sm text-slate-600">
              Screener responses are reviewed in the findings workflow.
            </p>
            {episode.status !== "DRAFT" && (
              <Link
                href={`/cases/${episode.id}/assessment`}
                className="ui-btn ui-btn-primary mt-4 inline-flex"
              >
                Open finding review
              </Link>
            )}
            {episode.status === "DRAFT" && (
              <p className="mt-4 text-sm text-amber-700">
                The initial assessment has not been submitted yet.
              </p>
            )}
          </section>
        )}

        {moduleKey === MODULE_KEYS.LIFE_MAP && (
          <LifeMapReview data={mod.data} />
        )}

        {moduleKey === MODULE_KEYS.GUIDED_REFLECTION && (
          <ReflectionReview data={mod.data} />
        )}

        {moduleKey === MODULE_KEYS.CAT_Q && (
          <div className="mt-4">
            {mod.status === "SUBMITTED" || mod.status === "COMPLETED" ? (
              <CatQResults
                answers={parseCatQAnswers(mod.data)}
                submittedAt={mod.submittedAt}
              />
            ) : (
              <section className="mt-8">
                <h1 className="ui-page-title">{mod.title}</h1>
                <p className="mt-4 text-sm text-amber-700">
                  CAT-Q has not been submitted yet ({STATUS_LABELS[mod.status] ?? mod.status}).
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Scores and response details appear here after the client submits.
                </p>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function LifeMapReview({ data }: { data: unknown }) {
  const { entries } = parseLifeMapData(data);
  if (entries.length === 0) {
    return (
      <p className="mt-8 text-sm text-slate-500">No timeline entries yet.</p>
    );
  }

  return (
    <ol className="mt-8 space-y-4">
      {entries.map((entry, index) => (
        <li key={entry.id} className="ui-card px-5 py-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Entry {index + 1}
          </p>
          <h2 className="mt-1 text-base font-semibold text-slate-900">
            {entry.title || entry.lifeStage || "Untitled period"}
          </h2>
          {entry.lifeStage && (
            <p className="mt-1 text-sm text-slate-500">{entry.lifeStage}</p>
          )}
          {entry.tags.length > 0 && (
            <p className="mt-2 text-xs text-slate-500">{entry.tags.join(" · ")}</p>
          )}
          <dl className="mt-4 space-y-3 text-sm">
            {(
              [
                ["What was happening", entry.description],
                ["Supportive / easier", entry.supportive],
                ["Difficult / confusing", entry.difficult],
                ["Adapted / coped", entry.adapted],
                ["Affects now", entry.affectsNow],
              ] as const
            ).map(([label, value]) =>
              value.trim() ? (
                <div key={label}>
                  <dt className="font-medium text-slate-700">{label}</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-slate-600">{value}</dd>
                </div>
              ) : null,
            )}
          </dl>
        </li>
      ))}
    </ol>
  );
}

function ReflectionReview({ data }: { data: unknown }) {
  const sections = parseGuidedReflectionData(data);
  const hasAny = GUIDED_REFLECTION_SECTIONS.some((s) => (sections[s.key] ?? "").trim());

  if (!hasAny) {
    return <p className="mt-8 text-sm text-slate-500">No reflection responses yet.</p>;
  }

  return (
    <div className="mt-8 space-y-4">
      {GUIDED_REFLECTION_SECTIONS.map((section) => {
        const value = sections[section.key] ?? "";
        if (!value.trim()) return null;
        return (
          <section key={section.key} className="ui-card px-5 py-5">
            <h2 className="text-base font-semibold text-slate-900">{section.title}</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{value}</p>
          </section>
        );
      })}
    </div>
  );
}
