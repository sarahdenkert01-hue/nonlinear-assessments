-- Sprint 3: Domain Evidence Layer — additive only.
-- DomainReview holds clinician synthesis per clinical domain; DomainEvidence links
-- confirmed findings (and future sources) to domains. No existing tables altered.

-- CreateEnum
CREATE TYPE "EvidenceSourceType" AS ENUM ('CLIENT_SELF_REPORT', 'CLINICIAN_INTERVIEW', 'CLINICIAN_OBSERVATION', 'COLLATERAL', 'STRUCTURED_MEASURE', 'MANUAL_NOTE', 'FINDING');

-- CreateTable
CREATE TABLE "DomainReview" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "confidence" "Confidence",
    "alternativeExplanations" TEXT[],
    "clinicalNotes" TEXT,
    "evidenceGapNotes" TEXT,
    "summaryDraft" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomainReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainEvidence" (
    "id" TEXT NOT NULL,
    "domainReviewId" TEXT NOT NULL,
    "sourceType" "EvidenceSourceType" NOT NULL,
    "findingId" TEXT,
    "responseId" TEXT,
    "moduleInstanceId" TEXT,
    "itemId" TEXT,
    "excerpt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DomainReview_episodeId_idx" ON "DomainReview"("episodeId");

-- CreateIndex
CREATE UNIQUE INDEX "DomainReview_episodeId_domainId_key" ON "DomainReview"("episodeId", "domainId");

-- CreateIndex
CREATE INDEX "DomainEvidence_domainReviewId_idx" ON "DomainEvidence"("domainReviewId");

-- CreateIndex
CREATE UNIQUE INDEX "DomainEvidence_domainReviewId_findingId_key" ON "DomainEvidence"("domainReviewId", "findingId");

-- AddForeignKey
ALTER TABLE "DomainReview" ADD CONSTRAINT "DomainReview_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "AssessmentEpisode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainEvidence" ADD CONSTRAINT "DomainEvidence_domainReviewId_fkey" FOREIGN KEY ("domainReviewId") REFERENCES "DomainReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
