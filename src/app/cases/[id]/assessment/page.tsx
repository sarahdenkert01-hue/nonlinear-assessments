import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { ClinicianHeader } from "@/components/clinician-header";
import { getSessionForClinician } from "@/lib/sessions";
import { SessionAssessmentReview } from "./session-review-client";

type PageProps = { params: Promise<{ id: string }> };

export default async function CaseAssessmentPage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;
  const session = await getSessionForClinician(id, userId);
  if (!session) notFound();

  if (session.status === "DRAFT") {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <ClinicianHeader title="Assessment" />
        <main className="mx-auto max-w-lg px-6 py-16">
          <h1 className="text-xl font-semibold text-gray-900">Intake not submitted</h1>
          <p className="mt-3 text-gray-600">
            {session.clientName ?? "This client"} has not submitted their questionnaire yet.
          </p>
          <Link
            href={`/intake/${session.token}`}
            target="_blank"
            className="mt-6 inline-block text-sm text-blue-600 hover:text-blue-800"
          >
            Open client intake link →
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div>
      <ClinicianHeader title="Review" />
      <SessionAssessmentReview session={session} />
    </div>
  );
}
