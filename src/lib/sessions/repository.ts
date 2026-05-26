import type { Prisma } from "@prisma/client";
import type { AssessmentAnswers, ClinicianOverrides } from "@/features/assessments";
import { logSessionEvent } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { generateIntakeToken } from "@/lib/tokens";
import type {
  AssessmentSessionRecord,
  ClientRecord,
  CreateClientInput,
  CreateSessionInput,
  ListSessionsQuery,
  SessionStatus,
  UpdateSessionReviewInput,
} from "./types";

const DEFAULT_TOKEN_EXPIRY_DAYS = 30;

function parseAnswers(value: Prisma.JsonValue): AssessmentAnswers {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as AssessmentAnswers;
  }
  return {};
}

function parseOverrides(value: Prisma.JsonValue | null): ClinicianOverrides | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as ClinicianOverrides;
  }
  return null;
}

function toIso(date: Date | null | undefined): string | null {
  return date?.toISOString() ?? null;
}

function toRecord(row: {
  id: string;
  token: string;
  clinicianId: string | null;
  clientId: string | null;
  status: SessionStatus;
  clientName: string | null;
  answers: Prisma.JsonValue;
  overrides: Prisma.JsonValue | null;
  clinicianNotes: string | null;
  reportDraft: string | null;
  reportFinal: string | null;
  reportGeneratedAt: Date | null;
  reportFinalizedAt: Date | null;
  consentAcceptedAt: Date | null;
  tokenExpiresAt: Date | null;
  revokedAt: Date | null;
  notifiedAt: Date | null;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): AssessmentSessionRecord {
  return {
    id: row.id,
    token: row.token,
    clinicianId: row.clinicianId,
    clientId: row.clientId,
    status: row.status,
    clientName: row.clientName,
    answers: parseAnswers(row.answers),
    overrides: parseOverrides(row.overrides),
    clinicianNotes: row.clinicianNotes,
    reportDraft: row.reportDraft,
    reportFinal: row.reportFinal,
    reportGeneratedAt: toIso(row.reportGeneratedAt),
    reportFinalizedAt: toIso(row.reportFinalizedAt),
    consentAcceptedAt: toIso(row.consentAcceptedAt),
    tokenExpiresAt: toIso(row.tokenExpiresAt),
    revokedAt: toIso(row.revokedAt),
    notifiedAt: toIso(row.notifiedAt),
    submittedAt: toIso(row.submittedAt),
    reviewedAt: toIso(row.reviewedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function buildFilterWhere(
  clinicianId: string,
  query: ListSessionsQuery,
): Prisma.AssessmentSessionWhereInput {
  const where: Prisma.AssessmentSessionWhereInput = { clinicianId };

  switch (query.filter) {
    case "awaiting_client":
      where.status = "DRAFT";
      break;
    case "ready_to_review":
      where.status = "SUBMITTED";
      where.reportDraft = null;
      break;
    case "in_progress":
      where.status = { in: ["SUBMITTED", "REVIEWED"] };
      where.reportDraft = { not: null };
      where.reportFinalizedAt = null;
      break;
    case "reviewed":
      where.status = "REVIEWED";
      break;
    default:
      break;
  }

  if (query.search?.trim()) {
    where.clientName = { contains: query.search.trim() };
  }

  return where;
}

export async function createClient(input: CreateClientInput): Promise<ClientRecord> {
  const row = await prisma.client.create({
    data: {
      clinicianId: input.clinicianId,
      displayName: input.displayName.trim(),
      email: input.email?.trim() ?? null,
    },
  });
  return {
    id: row.id,
    clinicianId: row.clinicianId,
    displayName: row.displayName,
    email: row.email,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listClientsForClinician(
  clinicianId: string,
): Promise<ClientRecord[]> {
  const rows = await prisma.client.findMany({
    where: { clinicianId },
    orderBy: { displayName: "asc" },
  });
  return rows.map((row) => ({
    id: row.id,
    clinicianId: row.clinicianId,
    displayName: row.displayName,
    email: row.email,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function getClientForClinician(
  id: string,
  clinicianId: string,
): Promise<ClientRecord | null> {
  const row = await prisma.client.findFirst({ where: { id, clinicianId } });
  if (!row) return null;
  return {
    id: row.id,
    clinicianId: row.clinicianId,
    displayName: row.displayName,
    email: row.email,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createSession(
  input: CreateSessionInput,
): Promise<AssessmentSessionRecord> {
  const days = input.tokenExpiresInDays ?? DEFAULT_TOKEN_EXPIRY_DAYS;
  const tokenExpiresAt = new Date();
  tokenExpiresAt.setDate(tokenExpiresAt.getDate() + days);

  let clientName = input.clientName ?? null;
  if (input.clientId) {
    const client = await prisma.client.findFirst({
      where: { id: input.clientId, clinicianId: input.clinicianId },
    });
    if (client) clientName = client.displayName;
  }

  const row = await prisma.assessmentSession.create({
    data: {
      token: generateIntakeToken(),
      clinicianId: input.clinicianId,
      clientId: input.clientId ?? null,
      clientName,
      answers: {} as Prisma.InputJsonValue,
      tokenExpiresAt,
    },
  });

  const record = toRecord(row);
  await logSessionEvent(record.id, "session.created", {
    actorType: "clinician",
    actorId: input.clinicianId,
    metadata: { clientName: record.clientName, expiresAt: record.tokenExpiresAt },
  });
  return record;
}

export async function listSessionsForClinician(
  clinicianId: string,
  query: ListSessionsQuery = {},
): Promise<AssessmentSessionRecord[]> {
  const rows = await prisma.assessmentSession.findMany({
    where: buildFilterWhere(clinicianId, query),
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(toRecord);
}

export async function getSessionByToken(
  token: string,
): Promise<AssessmentSessionRecord | null> {
  const row = await prisma.assessmentSession.findUnique({ where: { token } });
  return row ? toRecord(row) : null;
}

export async function getSessionById(
  id: string,
): Promise<AssessmentSessionRecord | null> {
  const row = await prisma.assessmentSession.findUnique({ where: { id } });
  return row ? toRecord(row) : null;
}

export async function getSessionForClinician(
  id: string,
  clinicianId: string,
): Promise<AssessmentSessionRecord | null> {
  const row = await prisma.assessmentSession.findFirst({
    where: { id, clinicianId },
  });
  return row ? toRecord(row) : null;
}

export async function listSessionsForClient(
  clientId: string,
  clinicianId: string,
): Promise<AssessmentSessionRecord[]> {
  const rows = await prisma.assessmentSession.findMany({
    where: { clientId, clinicianId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toRecord);
}

export async function acceptSessionConsent(
  token: string,
): Promise<AssessmentSessionRecord | null> {
  const existing = await prisma.assessmentSession.findUnique({ where: { token } });
  if (!existing || existing.status !== "DRAFT" || existing.revokedAt) return null;

  const row = await prisma.assessmentSession.update({
    where: { token },
    data: { consentAcceptedAt: new Date() },
  });
  const record = toRecord(row);
  await logSessionEvent(record.id, "intake.consent_accepted", {
    actorType: "client",
  });
  return record;
}

export async function updateSessionAnswers(
  token: string,
  answers: AssessmentAnswers,
): Promise<AssessmentSessionRecord | null> {
  const existing = await prisma.assessmentSession.findUnique({ where: { token } });
  if (!existing || existing.status !== "DRAFT" || existing.revokedAt) return null;
  if (!existing.consentAcceptedAt) return null;

  const row = await prisma.assessmentSession.update({
    where: { token },
    data: { answers },
  });
  return toRecord(row);
}

export async function submitSession(
  token: string,
  answers?: AssessmentAnswers,
): Promise<AssessmentSessionRecord | null> {
  const existing = await prisma.assessmentSession.findUnique({ where: { token } });
  if (!existing || existing.status !== "DRAFT" || existing.revokedAt) return null;
  if (!existing.consentAcceptedAt) return null;

  const row = await prisma.assessmentSession.update({
    where: { token },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      ...(answers !== undefined ? { answers } : {}),
    },
  });
  const record = toRecord(row);
  await logSessionEvent(record.id, "intake.submitted", { actorType: "client" });
  return record;
}

export async function updateSessionReview(
  id: string,
  clinicianId: string,
  input: UpdateSessionReviewInput,
): Promise<AssessmentSessionRecord | null> {
  const existing = await prisma.assessmentSession.findFirst({
    where: { id, clinicianId },
  });
  if (!existing || existing.status === "DRAFT") return null;
  if (existing.reportFinalizedAt && (input.reportDraft !== undefined || input.overrides)) {
    return null;
  }

  const row = await prisma.assessmentSession.update({
    where: { id },
    data: {
      ...(input.overrides !== undefined ? { overrides: input.overrides } : {}),
      ...(input.clinicianNotes !== undefined
        ? { clinicianNotes: input.clinicianNotes }
        : {}),
      ...(input.reportDraft !== undefined ? { reportDraft: input.reportDraft } : {}),
      ...(input.reportFinal !== undefined ? { reportFinal: input.reportFinal } : {}),
      ...(input.reportFinalized
        ? {
            reportFinal: input.reportFinal ?? existing.reportDraft ?? existing.reportFinal,
            reportFinalizedAt: new Date(),
          }
        : {}),
      ...(input.status === "REVIEWED"
        ? { status: "REVIEWED", reviewedAt: new Date() }
        : {}),
    },
  });
  return toRecord(row);
}

export async function saveSessionReport(
  id: string,
  clinicianId: string,
  reportDraft: string,
  generatedAt: Date = new Date(),
): Promise<AssessmentSessionRecord | null> {
  const existing = await prisma.assessmentSession.findFirst({
    where: { id, clinicianId },
  });
  if (!existing || existing.status === "DRAFT" || existing.reportFinalizedAt) return null;

  const row = await prisma.assessmentSession.update({
    where: { id },
    data: {
      reportDraft,
      reportGeneratedAt: generatedAt,
    },
  });
  return toRecord(row);
}

export async function revokeSessionToken(
  id: string,
  clinicianId: string,
): Promise<AssessmentSessionRecord | null> {
  const existing = await prisma.assessmentSession.findFirst({
    where: { id, clinicianId },
  });
  if (!existing) return null;

  const row = await prisma.assessmentSession.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
  const record = toRecord(row);
  await logSessionEvent(record.id, "session.token_revoked", {
    actorType: "clinician",
    actorId: clinicianId,
  });
  return record;
}

export async function extendSessionToken(
  id: string,
  clinicianId: string,
  days = DEFAULT_TOKEN_EXPIRY_DAYS,
): Promise<AssessmentSessionRecord | null> {
  const existing = await prisma.assessmentSession.findFirst({
    where: { id, clinicianId },
  });
  if (!existing) return null;

  const tokenExpiresAt = new Date();
  tokenExpiresAt.setDate(tokenExpiresAt.getDate() + days);

  const row = await prisma.assessmentSession.update({
    where: { id },
    data: { tokenExpiresAt, revokedAt: null },
  });
  const record = toRecord(row);
  await logSessionEvent(record.id, "session.token_extended", {
    actorType: "clinician",
    actorId: clinicianId,
    metadata: { expiresAt: record.tokenExpiresAt },
  });
  return record;
}

export async function markSessionNotified(id: string): Promise<void> {
  await prisma.assessmentSession.update({
    where: { id },
    data: { notifiedAt: new Date() },
  });
}
