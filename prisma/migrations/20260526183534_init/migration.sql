-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REVIEWED');

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentSession" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "clinicianId" TEXT,
    "clientId" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'DRAFT',
    "clientName" TEXT,
    "answers" JSONB NOT NULL,
    "overrides" JSONB,
    "clinicianNotes" TEXT,
    "reportDraft" TEXT,
    "reportFinal" TEXT,
    "reportGeneratedAt" TIMESTAMP(3),
    "reportFinalizedAt" TIMESTAMP(3),
    "consentAcceptedAt" TIMESTAMP(3),
    "tokenExpiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Client_clinicianId_idx" ON "Client"("clinicianId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentSession_token_key" ON "AssessmentSession"("token");

-- CreateIndex
CREATE INDEX "AssessmentSession_clinicianId_idx" ON "AssessmentSession"("clinicianId");

-- CreateIndex
CREATE INDEX "AssessmentSession_clientId_idx" ON "AssessmentSession"("clientId");

-- CreateIndex
CREATE INDEX "AssessmentSession_status_idx" ON "AssessmentSession"("status");

-- CreateIndex
CREATE INDEX "SessionEvent_sessionId_idx" ON "SessionEvent"("sessionId");

-- CreateIndex
CREATE INDEX "SessionEvent_createdAt_idx" ON "SessionEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "AssessmentSession" ADD CONSTRAINT "AssessmentSession_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionEvent" ADD CONSTRAINT "SessionEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AssessmentSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
