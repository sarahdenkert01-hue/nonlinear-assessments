-- Sprint 2: persisted clinical findings + evidence traceability.
-- Purely additive: creates Finding + FindingEvidence and their enums. No existing table is
-- altered or dropped, and no data is migrated here (findings are generated lazily by the app
-- for already-submitted episodes on first review load).

-- CreateEnum
CREATE TYPE "FindingStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'EDITED', 'EXCLUDED');

-- CreateEnum
CREATE TYPE "FindingSource" AS ENUM ('ALGORITHM', 'CLINICIAN');

-- CreateEnum
CREATE TYPE "Confidence" AS ENUM ('LOW', 'MODERATE', 'HIGH');

-- CreateTable
CREATE TABLE "Finding" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "moduleInstanceId" TEXT,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT,
    "status" "FindingStatus" NOT NULL DEFAULT 'PROPOSED',
    "source" "FindingSource" NOT NULL DEFAULT 'ALGORITHM',
    "confidence" "Confidence",
    "alternativeExplanations" TEXT[],
    "rationale" TEXT,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FindingEvidence" (
    "id" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "responseId" TEXT,
    "itemId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FindingEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Finding_episodeId_idx" ON "Finding"("episodeId");

-- CreateIndex
CREATE INDEX "Finding_status_idx" ON "Finding"("status");

-- CreateIndex
CREATE INDEX "FindingEvidence_findingId_idx" ON "FindingEvidence"("findingId");

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "AssessmentEpisode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_moduleInstanceId_fkey" FOREIGN KEY ("moduleInstanceId") REFERENCES "ModuleInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FindingEvidence" ADD CONSTRAINT "FindingEvidence_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FindingEvidence" ADD CONSTRAINT "FindingEvidence_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response"("id") ON DELETE SET NULL ON UPDATE CASCADE;
