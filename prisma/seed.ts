import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SAMPLE_ANSWERS = {
  q01: "Often",
  q02: "Very Often",
  q07: "Often",
  q08: "Often",
  q10: "Very Often",
  q15: "Sometimes",
};

async function main() {
  const existing = await prisma.assessmentSession.findFirst({
    where: { token: "dev-sample-token" },
  });

  if (existing) {
    console.log("Seed session already exists:");
    console.log(`  Intake: /intake/${existing.token}`);
    console.log(`  Review: /cases/${existing.id}/assessment`);
    return;
  }

  const session = await prisma.assessmentSession.create({
    data: {
      token: "dev-sample-token",
      clinicianId: "dev-clinician",
      clientName: "Sample Client",
      status: "SUBMITTED",
      answers: SAMPLE_ANSWERS,
      submittedAt: new Date(),
    },
  });

  console.log("Created sample session:");
  console.log(`  Intake: http://localhost:3000/intake/${session.token}`);
  console.log(`  Review: http://localhost:3000/cases/${session.id}/assessment`);
  console.log("");
  console.log(
    "Note: Link the session to your Clerk user by updating clinicianId in the DB,",
  );
  console.log("or create a new intake from the dashboard while signed in.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
