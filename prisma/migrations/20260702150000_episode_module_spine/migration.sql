-- Sprint 1: introduce Client -> AssessmentEpisode -> ModuleInstance -> Response spine.
-- Existing AssessmentSession rows are converted (not dropped) into one episode + one Nonlinear
-- screener module + its responses. SessionEvent rows become AuditEvent rows.

-- CreateEnum
CREATE TYPE "ModuleAudience" AS ENUM ('CLIENT', 'CLINICIAN');
CREATE TYPE "ModuleStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED');
CREATE TYPE "AuthorType" AS ENUM ('CLIENT', 'CLINICIAN', 'SYSTEM');

-- CreateTable: AssessmentEpisode
CREATE TABLE "AssessmentEpisode" (
    "id" TEXT NOT NULL,
    "clinicianId" TEXT,
    "clientId" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'DRAFT',
    "clientName" TEXT,
    "overrides" JSONB,
    "clinicianNotes" TEXT,
    "reportDraft" TEXT,
    "reportFinal" TEXT,
    "reportGeneratedAt" TIMESTAMP(3),
    "reportFinalizedAt" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentEpisode_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ModuleInstance
CREATE TABLE "ModuleInstance" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "moduleVersion" TEXT NOT NULL,
    "audience" "ModuleAudience" NOT NULL DEFAULT 'CLIENT',
    "status" "ModuleStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "token" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "consentAcceptedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuleInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Response
CREATE TABLE "Response" (
    "id" TEXT NOT NULL,
    "moduleInstanceId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Response_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AuditEvent
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "moduleInstanceId" TEXT,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "AssessmentEpisode_clinicianId_idx" ON "AssessmentEpisode"("clinicianId");
CREATE INDEX "AssessmentEpisode_clientId_idx" ON "AssessmentEpisode"("clientId");
CREATE INDEX "AssessmentEpisode_status_idx" ON "AssessmentEpisode"("status");
CREATE UNIQUE INDEX "ModuleInstance_token_key" ON "ModuleInstance"("token");
CREATE INDEX "ModuleInstance_episodeId_idx" ON "ModuleInstance"("episodeId");
CREATE INDEX "ModuleInstance_moduleKey_idx" ON "ModuleInstance"("moduleKey");
CREATE INDEX "ModuleInstance_status_idx" ON "ModuleInstance"("status");
CREATE UNIQUE INDEX "Response_moduleInstanceId_itemId_key" ON "Response"("moduleInstanceId", "itemId");
CREATE INDEX "Response_moduleInstanceId_idx" ON "Response"("moduleInstanceId");
CREATE INDEX "AuditEvent_episodeId_idx" ON "AuditEvent"("episodeId");
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- Foreign keys
ALTER TABLE "AssessmentEpisode" ADD CONSTRAINT "AssessmentEpisode_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ModuleInstance" ADD CONSTRAINT "ModuleInstance_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "AssessmentEpisode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Response" ADD CONSTRAINT "Response_moduleInstanceId_fkey" FOREIGN KEY ("moduleInstanceId") REFERENCES "ModuleInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "AssessmentEpisode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_moduleInstanceId_fkey" FOREIGN KEY ("moduleInstanceId") REFERENCES "ModuleInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: one episode per existing session (id preserved so /cases/:id links keep working).
INSERT INTO "AssessmentEpisode" (
    "id", "clinicianId", "clientId", "status", "clientName", "overrides", "clinicianNotes",
    "reportDraft", "reportFinal", "reportGeneratedAt", "reportFinalizedAt", "notifiedAt",
    "submittedAt", "reviewedAt", "createdAt", "updatedAt"
)
SELECT
    "id", "clinicianId", "clientId", "status", "clientName", "overrides", "clinicianNotes",
    "reportDraft", "reportFinal", "reportGeneratedAt", "reportFinalizedAt", "notifiedAt",
    "submittedAt", "reviewedAt", "createdAt", "updatedAt"
FROM "AssessmentSession";

-- Backfill: one Nonlinear screener module per episode, carrying the delivery token + consent.
INSERT INTO "ModuleInstance" (
    "id", "episodeId", "moduleKey", "moduleVersion", "audience", "status",
    "token", "tokenExpiresAt", "revokedAt", "consentAcceptedAt", "submittedAt",
    "createdAt", "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    s."id",
    'nonlinear-screener',
    '1',
    'CLIENT'::"ModuleAudience",
    CASE
        WHEN s."status" = 'REVIEWED' THEN 'COMPLETED'
        WHEN s."status" = 'SUBMITTED' THEN 'SUBMITTED'
        WHEN s."consentAcceptedAt" IS NOT NULL THEN 'IN_PROGRESS'
        ELSE 'NOT_STARTED'
    END::"ModuleStatus",
    s."token",
    s."tokenExpiresAt",
    s."revokedAt",
    s."consentAcceptedAt",
    s."submittedAt",
    s."createdAt",
    s."updatedAt"
FROM "AssessmentSession" s;

-- Backfill: expand each session's answers JSON into normalized Response rows.
INSERT INTO "Response" ("id", "moduleInstanceId", "itemId", "value", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    m."id",
    kv."key",
    to_jsonb(kv."value"),
    s."createdAt",
    s."updatedAt"
FROM "AssessmentSession" s
JOIN "ModuleInstance" m ON m."episodeId" = s."id"
CROSS JOIN LATERAL jsonb_each_text(s."answers") AS kv("key", "value")
WHERE jsonb_typeof(s."answers") = 'object';

-- Backfill: audit log.
INSERT INTO "AuditEvent" (
    "id", "episodeId", "moduleInstanceId", "actorType", "actorId", "action", "metadata", "createdAt"
)
SELECT
    e."id", e."sessionId", NULL, e."actorType", e."actorId", e."action", e."metadata", e."createdAt"
FROM "SessionEvent" e;

-- Drop the old tables now that their data has been migrated.
ALTER TABLE "SessionEvent" DROP CONSTRAINT "SessionEvent_sessionId_fkey";
ALTER TABLE "AssessmentSession" DROP CONSTRAINT "AssessmentSession_clientId_fkey";
DROP TABLE "SessionEvent";
DROP TABLE "AssessmentSession";
