-- Additive only: nullable concurrency field + recoverable history table.
-- Does not rewrite existing Response rows or clinical answer values.

ALTER TABLE "ModuleInstance" ADD COLUMN IF NOT EXISTS "responseRevision" INTEGER;

CREATE TABLE IF NOT EXISTS "ResponseRevision" (
    "id" TEXT NOT NULL,
    "moduleInstanceId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "operation" TEXT NOT NULL,
    "itemIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "clearItemIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "previousSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResponseRevision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ResponseRevision_moduleInstanceId_revision_idx"
  ON "ResponseRevision"("moduleInstanceId", "revision");

CREATE INDEX IF NOT EXISTS "ResponseRevision_createdAt_idx"
  ON "ResponseRevision"("createdAt");

ALTER TABLE "ResponseRevision"
  ADD CONSTRAINT "ResponseRevision_moduleInstanceId_fkey"
  FOREIGN KEY ("moduleInstanceId") REFERENCES "ModuleInstance"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
