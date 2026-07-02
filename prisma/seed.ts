import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SAMPLE_ANSWERS: Record<string, string> = {
  q01: "Often",
  q02: "Very Often",
  q07: "Often",
  q08: "Often",
  q10: "Very Often",
  q15: "Sometimes",
};

const SAMPLE_TOKEN = "dev-sample-token";

async function main() {
  const existingModule = await prisma.moduleInstance.findFirst({
    where: { token: SAMPLE_TOKEN },
  });

  if (existingModule) {
    console.log("Seed episode already exists:");
    console.log(`  Intake: /intake/${SAMPLE_TOKEN}`);
    console.log(`  Overview: /cases/${existingModule.episodeId}`);
    return;
  }

  const now = new Date();
  const episode = await prisma.assessmentEpisode.create({
    data: {
      clinicianId: "dev-clinician",
      clientName: "Sample Client",
      status: "SUBMITTED",
      submittedAt: now,
      modules: {
        create: {
          moduleKey: "nonlinear-screener",
          moduleVersion: "1",
          audience: "CLIENT",
          status: "SUBMITTED",
          token: SAMPLE_TOKEN,
          consentAcceptedAt: now,
          submittedAt: now,
          responses: {
            create: Object.entries(SAMPLE_ANSWERS).map(([itemId, value]) => ({
              itemId,
              value,
            })),
          },
        },
      },
    },
  });

  console.log("Created sample episode:");
  console.log(`  Intake: http://localhost:3000/intake/${SAMPLE_TOKEN}`);
  console.log(`  Overview: http://localhost:3000/cases/${episode.id}`);
  console.log(`  Review: http://localhost:3000/cases/${episode.id}/assessment`);
  console.log("");
  console.log(
    "Note: link the episode to your Clerk user by updating clinicianId in the DB,",
  );
  console.log("or create a new intake from the dashboard while signed in.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
