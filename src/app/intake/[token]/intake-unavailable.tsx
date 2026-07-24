export function IntakeUnavailable({
  reason = "unexpected",
}: {
  reason?: "database" | "unexpected";
}) {
  const isDb = reason === "database";
  return (
    <main className="mx-auto max-w-lg px-6 py-16 text-center">
      <h1 className="text-xl font-semibold text-slate-900">
        {isDb ? "Assessment temporarily unavailable" : "Something went wrong"}
      </h1>
      <p className="mt-3 text-slate-600">
        {isDb
          ? "We could not connect to the assessment database. Please try again in a few minutes, or contact your clinician for a new link if this continues."
          : "We could not open this assessment link right now. Please try again shortly."}
      </p>
    </main>
  );
}

export function isDatabaseConnectivityError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.name === "PrismaClientInitializationError") return true;
  return /Can't reach database server|P1001|P1017|PrismaClientInitializationError/i.test(
    err.message,
  );
}
