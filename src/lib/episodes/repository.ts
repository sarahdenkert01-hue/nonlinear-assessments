import type { Prisma } from "@prisma/client";
import type { AssessmentAnswers, ClinicianOverrides } from "@/features/assessments";
import { logSessionEvent } from "@/lib/audit";
import {
  MODULE_KEYS,
  assertKnownModuleKey,
  getDefaultClientModules,
  getModuleDefinition,
  validateModulePayload,
  type ClientAssessmentEpisode,
  type ClientModuleRecord,
} from "@/lib/modules";
import { prisma } from "@/lib/prisma";
import { generateIntakeToken } from "@/lib/tokens";
import {
  answersToRows,
  moduleDataToRows,
  responsesToAnswers,
  responsesToModuleData,
  type ModuleDataPayload,
} from "./responses";
import type {
  ClientRecord,
  CreateClientInput,
  CreateSessionInput,
  EpisodeRecord,
  ListSessionsQuery,
  ModuleSummary,
  UpdateSessionReviewInput,
} from "./types";

const DEFAULT_TOKEN_EXPIRY_DAYS = 30;

const SCREENER = { key: MODULE_KEYS.SCREENER, version: "1" } as const;

// Always load an episode together with its modules and their answers so we can present the
// flat screener record the rest of the app expects, plus multi-module journey views.
const episodeInclude = {
  modules: {
    orderBy: { createdAt: "asc" },
    include: { responses: true },
  },
} satisfies Prisma.AssessmentEpisodeInclude;

type EpisodeRow = Prisma.AssessmentEpisodeGetPayload<{ include: typeof episodeInclude }>;
type ModuleRow = EpisodeRow["modules"][number];

function toIso(date: Date | null | undefined): string | null {
  return date?.toISOString() ?? null;
}

function parseOverrides(value: Prisma.JsonValue | null): ClinicianOverrides | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as ClinicianOverrides;
  }
  return null;
}

/** Prefer the screener for legacy flat EpisodeRecord; fall back to first CLIENT module. */
function screenerModule(row: EpisodeRow): ModuleRow | null {
  return (
    row.modules.find((m) => m.moduleKey === SCREENER.key) ??
    row.modules.find((m) => m.audience === "CLIENT" && m.token) ??
    row.modules.find((m) => m.audience === "CLIENT") ??
    row.modules[0] ??
    null
  );
}

/** Module that carries the intake token used in `/intake/[token]`. */
function tokenBearingModule(row: EpisodeRow, token?: string): ModuleRow | null {
  if (token) {
    return row.modules.find((m) => m.token === token) ?? null;
  }
  return (
    row.modules.find((m) => m.moduleKey === SCREENER.key && m.token) ??
    row.modules.find((m) => m.audience === "CLIENT" && m.token) ??
    null
  );
}

function clientModules(row: EpisodeRow): ModuleRow[] {
  return row.modules.filter((m) => m.audience === "CLIENT");
}

function toRecord(row: EpisodeRow): EpisodeRecord {
  const clientMod = screenerModule(row);
  const answers = responsesToAnswers(clientMod?.responses ?? []);

  return {
    id: row.id,
    token: clientMod?.token ?? "",
    clinicianId: row.clinicianId,
    clientId: row.clientId,
    status: row.status,
    clientName: row.clientName,
    answers,
    overrides: parseOverrides(row.overrides),
    clinicianNotes: row.clinicianNotes,
    reportDraft: row.reportDraft,
    reportFinal: row.reportFinal,
    reportGeneratedAt: toIso(row.reportGeneratedAt),
    reportFinalizedAt: toIso(row.reportFinalizedAt),
    consentAcceptedAt: toIso(clientMod?.consentAcceptedAt),
    tokenExpiresAt: toIso(clientMod?.tokenExpiresAt),
    revokedAt: toIso(clientMod?.revokedAt),
    notifiedAt: toIso(row.notifiedAt),
    submittedAt: toIso(row.submittedAt),
    reviewedAt: toIso(row.reviewedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function moduleToClientRecord(m: ModuleRow): ClientModuleRecord {
  const def = getModuleDefinition(m.moduleKey);
  const isScreener = m.moduleKey === SCREENER.key;
  const data = isScreener
    ? responsesToAnswers(m.responses)
    : responsesToModuleData(m.responses);

  return {
    id: m.id,
    moduleKey: m.moduleKey,
    moduleVersion: m.moduleVersion,
    title: def?.title ?? m.moduleKey,
    description: def?.description ?? "",
    estimatedMinutes: def?.estimatedMinutes ?? 15,
    required: def?.required ?? true,
    status: m.status,
    data,
    submittedAt: toIso(m.submittedAt),
    displayOrder: def?.displayOrder ?? 99,
  };
}

function toClientEpisode(row: EpisodeRow, token: string): ClientAssessmentEpisode {
  const tokenMod = tokenBearingModule(row, token) ?? screenerModule(row);
  const modules = clientModules(row)
    .map(moduleToClientRecord)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const required = modules.filter((m) => m.required);
  const allRequiredSubmitted =
    required.length > 0 &&
    required.every((m) => m.status === "SUBMITTED" || m.status === "COMPLETED");

  return {
    id: row.id,
    status: row.status,
    clientName: row.clientName,
    consentAcceptedAt: toIso(tokenMod?.consentAcceptedAt),
    token: tokenMod?.token ?? token,
    tokenExpiresAt: toIso(tokenMod?.tokenExpiresAt),
    revokedAt: toIso(tokenMod?.revokedAt),
    modules,
    allRequiredSubmitted,
  };
}

function toClientRecord(row: {
  id: string;
  clinicianId: string;
  displayName: string;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ClientRecord {
  return {
    id: row.id,
    clinicianId: row.clinicianId,
    displayName: row.displayName,
    email: row.email,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function loadEpisodeById(id: string): Promise<EpisodeRecord | null> {
  const row = await prisma.assessmentEpisode.findUnique({ where: { id }, include: episodeInclude });
  return row ? toRecord(row) : null;
}

async function loadEpisodeRowByToken(token: string): Promise<EpisodeRow | null> {
  return prisma.assessmentEpisode.findFirst({
    where: { modules: { some: { token } } },
    include: episodeInclude,
  });
}

async function loadEpisodeByToken(token: string): Promise<EpisodeRecord | null> {
  const row = await loadEpisodeRowByToken(token);
  return row ? toRecord(row) : null;
}

function buildFilterWhere(
  clinicianId: string,
  query: ListSessionsQuery,
): Prisma.AssessmentEpisodeWhereInput {
  const where: Prisma.AssessmentEpisodeWhereInput = { clinicianId };

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

async function replaceModuleResponses(
  moduleInstanceId: string,
  answers: AssessmentAnswers,
): Promise<boolean> {
  const rows = answersToRows(answers);
  return writeModuleResponsesLocked(moduleInstanceId, rows, { status: "IN_PROGRESS" });
}

async function replaceModuleData(
  moduleInstanceId: string,
  data: ModuleDataPayload,
): Promise<boolean> {
  const rows = moduleDataToRows(data);
  return writeModuleResponsesLocked(moduleInstanceId, rows, { status: "IN_PROGRESS" });
}

async function submitModuleResponsesLocked(
  moduleInstanceId: string,
  rows: { itemId: string; value: Prisma.InputJsonValue }[],
): Promise<boolean> {
  return writeModuleResponsesLocked(moduleInstanceId, rows, {
    status: "SUBMITTED",
    submittedAt: new Date(),
  });
}

/**
 * Serialize autosave/submit writes per module instance so concurrent PATCHes cannot
 * interleave deleteMany/createMany, and refuse writes once the module is submitted.
 */
async function writeModuleResponsesLocked(
  moduleInstanceId: string,
  rows: { itemId: string; value: Prisma.InputJsonValue }[],
  next: { status: "IN_PROGRESS" | "SUBMITTED"; submittedAt?: Date },
): Promise<boolean> {
  try {
    await prisma.$transaction(async (tx) => {
      // Row lock so concurrent autosaves queue instead of interleaving deletes.
      const locked = await tx.$queryRaw<Array<{ id: string; status: string }>>`
        SELECT id, status FROM "ModuleInstance" WHERE id = ${moduleInstanceId} FOR UPDATE
      `;
      const current = locked[0];
      if (!current) {
        throw new Error("MODULE_MISSING");
      }
      if (current.status === "SUBMITTED" || current.status === "COMPLETED") {
        throw new Error("MODULE_LOCKED");
      }

      await tx.response.deleteMany({ where: { moduleInstanceId } });
      if (rows.length > 0) {
        await tx.response.createMany({
          data: rows.map((r) => ({
            moduleInstanceId,
            itemId: r.itemId,
            value: r.value,
          })),
        });
      }
      await tx.moduleInstance.update({
        where: { id: moduleInstanceId },
        data: {
          status: next.status,
          ...(next.submittedAt ? { submittedAt: next.submittedAt } : {}),
        },
      });
    });
    return true;
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message === "MODULE_LOCKED" || err.message === "MODULE_MISSING")
    ) {
      return false;
    }
    throw err;
  }
}

/**
 * Resolve a module within a token-authorized episode.
 * Never trusts a client-supplied module id alone — membership is verified via the token.
 * Also rejects unknown registry keys, revoked tokens, and expired tokens.
 */
async function resolveModuleForToken(
  token: string,
  moduleKey: string,
): Promise<{ row: EpisodeRow; mod: ModuleRow; tokenMod: ModuleRow } | null> {
  if (!assertKnownModuleKey(moduleKey)) return null;

  const row = await loadEpisodeRowByToken(token);
  if (!row) return null;
  const tokenMod = tokenBearingModule(row, token);
  if (!tokenMod || tokenMod.revokedAt) return null;
  if (tokenMod.tokenExpiresAt && tokenMod.tokenExpiresAt < new Date()) return null;

  const mod = row.modules.find(
    (m) => m.moduleKey === moduleKey && m.audience === "CLIENT",
  );
  if (!mod) return null;
  return { row, mod, tokenMod };
}

function isModuleEditable(mod: ModuleRow): boolean {
  return mod.status !== "SUBMITTED" && mod.status !== "COMPLETED";
}

export async function createClient(input: CreateClientInput): Promise<ClientRecord> {
  const row = await prisma.client.create({
    data: {
      clinicianId: input.clinicianId,
      displayName: input.displayName.trim(),
      email: input.email?.trim() ?? null,
    },
  });
  return toClientRecord(row);
}

export async function listClientsForClinician(clinicianId: string): Promise<ClientRecord[]> {
  const rows = await prisma.client.findMany({
    where: { clinicianId },
    orderBy: { displayName: "asc" },
  });
  return rows.map(toClientRecord);
}

export async function getClientForClinician(
  id: string,
  clinicianId: string,
): Promise<ClientRecord | null> {
  const row = await prisma.client.findFirst({ where: { id, clinicianId } });
  return row ? toClientRecord(row) : null;
}

export async function createSession(input: CreateSessionInput): Promise<EpisodeRecord> {
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

  const defaults = getDefaultClientModules();
  const intakeToken = generateIntakeToken();

  const row = await prisma.$transaction(async (tx) => {
    const episode = await tx.assessmentEpisode.create({
      data: {
        clinicianId: input.clinicianId,
        clientId: input.clientId ?? null,
        clientName,
      },
    });

    for (const def of defaults) {
      const isScreener = def.moduleKey === SCREENER.key;
      await tx.moduleInstance.create({
        data: {
          episodeId: episode.id,
          moduleKey: def.moduleKey,
          moduleVersion: def.moduleVersion,
          audience: "CLIENT",
          status: "NOT_STARTED",
          ...(isScreener
            ? { token: intakeToken, tokenExpiresAt }
            : {}),
        },
      });
    }

    return tx.assessmentEpisode.findUniqueOrThrow({
      where: { id: episode.id },
      include: episodeInclude,
    });
  });

  const record = toRecord(row);
  await logSessionEvent(record.id, "session.created", {
    actorType: "clinician",
    actorId: input.clinicianId,
    metadata: {
      clientName: record.clientName,
      expiresAt: record.tokenExpiresAt,
      modules: defaults.map((d) => d.moduleKey),
    },
  });
  return record;
}

/**
 * Add missing default exploration modules to an existing episode (clinician-initiated).
 * Does not alter historical response data or revoke existing tokens.
 */
export async function addExplorationModules(
  episodeId: string,
  clinicianId: string,
): Promise<ModuleSummary[] | null> {
  const row = await prisma.assessmentEpisode.findFirst({
    where: { id: episodeId, clinicianId },
    include: episodeInclude,
  });
  if (!row) return null;

  const existingKeys = new Set(row.modules.map((m) => m.moduleKey));
  const toAdd = getDefaultClientModules().filter((d) => !existingKeys.has(d.moduleKey));

  for (const def of toAdd) {
    // Never add a second screener token — only exploration modules.
    if (def.moduleKey === SCREENER.key) continue;
    await prisma.moduleInstance.create({
      data: {
        episodeId: row.id,
        moduleKey: def.moduleKey,
        moduleVersion: def.moduleVersion,
        audience: "CLIENT",
        status: "NOT_STARTED",
      },
    });
  }

  if (toAdd.length > 0) {
    await logSessionEvent(row.id, "session.explorations_added", {
      actorType: "clinician",
      actorId: clinicianId,
      metadata: { modules: toAdd.map((d) => d.moduleKey) },
    });
  }

  return listModulesForEpisode(episodeId, clinicianId);
}

export async function listSessionsForClinician(
  clinicianId: string,
  query: ListSessionsQuery = {},
): Promise<EpisodeRecord[]> {
  const rows = await prisma.assessmentEpisode.findMany({
    where: buildFilterWhere(clinicianId, query),
    orderBy: { updatedAt: "desc" },
    include: episodeInclude,
  });
  return rows.map(toRecord);
}

export async function getSessionByToken(token: string): Promise<EpisodeRecord | null> {
  return loadEpisodeByToken(token);
}

export async function getClientEpisodeByToken(
  token: string,
): Promise<ClientAssessmentEpisode | null> {
  const row = await loadEpisodeRowByToken(token);
  if (!row) return null;
  return toClientEpisode(row, token);
}

export async function getSessionById(id: string): Promise<EpisodeRecord | null> {
  return loadEpisodeById(id);
}

export async function getSessionForClinician(
  id: string,
  clinicianId: string,
): Promise<EpisodeRecord | null> {
  const row = await prisma.assessmentEpisode.findFirst({
    where: { id, clinicianId },
    include: episodeInclude,
  });
  return row ? toRecord(row) : null;
}

export async function getClientModulesForClinician(
  episodeId: string,
  clinicianId: string,
): Promise<ClientModuleRecord[] | null> {
  const row = await prisma.assessmentEpisode.findFirst({
    where: { id: episodeId, clinicianId },
    include: episodeInclude,
  });
  if (!row) return null;
  return clientModules(row)
    .map(moduleToClientRecord)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

export async function getModuleForClinician(
  episodeId: string,
  clinicianId: string,
  moduleKey: string,
): Promise<ClientModuleRecord | null> {
  const modules = await getClientModulesForClinician(episodeId, clinicianId);
  if (!modules) return null;
  return modules.find((m) => m.moduleKey === moduleKey) ?? null;
}

export async function listSessionsForClient(
  clientId: string,
  clinicianId: string,
): Promise<EpisodeRecord[]> {
  const rows = await prisma.assessmentEpisode.findMany({
    where: { clientId, clinicianId },
    orderBy: { createdAt: "desc" },
    include: episodeInclude,
  });
  return rows.map(toRecord);
}

export async function listModulesForEpisode(
  id: string,
  clinicianId: string,
): Promise<ModuleSummary[] | null> {
  const row = await prisma.assessmentEpisode.findFirst({
    where: { id, clinicianId },
    include: episodeInclude,
  });
  if (!row) return null;
  return row.modules
    .map((m) => {
      const def = getModuleDefinition(m.moduleKey);
      return {
        id: m.id,
        moduleKey: m.moduleKey,
        moduleVersion: m.moduleVersion,
        audience: m.audience,
        status: m.status,
        answeredCount: m.responses.length,
        submittedAt: toIso(m.submittedAt),
        title: def?.title ?? m.moduleKey,
      };
    })
    .sort((a, b) => {
      const ao = getModuleDefinition(a.moduleKey)?.displayOrder ?? 99;
      const bo = getModuleDefinition(b.moduleKey)?.displayOrder ?? 99;
      return ao - bo;
    });
}

export async function acceptSessionConsent(token: string): Promise<EpisodeRecord | null> {
  const row = await loadEpisodeRowByToken(token);
  const tokenMod = row ? tokenBearingModule(row, token) : null;
  if (!row || !tokenMod || tokenMod.revokedAt) return null;
  if (tokenMod.tokenExpiresAt && tokenMod.tokenExpiresAt < new Date()) return null;
  // Consent may be accepted while the episode is still DRAFT, or after screener submit
  // if we ever re-open — but typically once on first visit.
  if (tokenMod.consentAcceptedAt) {
    return loadEpisodeById(row.id);
  }

  await prisma.moduleInstance.update({
    where: { id: tokenMod.id },
    data: {
      consentAcceptedAt: new Date(),
      status: tokenMod.status === "NOT_STARTED" ? "IN_PROGRESS" : tokenMod.status,
    },
  });

  await logSessionEvent(row.id, "intake.consent_accepted", { actorType: "client" });
  return loadEpisodeById(row.id);
}

export async function updateSessionAnswers(
  token: string,
  answers: AssessmentAnswers,
): Promise<EpisodeRecord | null> {
  const resolved = await resolveModuleForToken(token, SCREENER.key);
  if (!resolved) return null;
  const { row, mod, tokenMod } = resolved;
  if (!tokenMod.consentAcceptedAt || !isModuleEditable(mod)) return null;

  const validation = validateModulePayload(SCREENER.key, answers);
  if (!validation.ok) return null;

  const wrote = await replaceModuleResponses(
    mod.id,
    validation.data as AssessmentAnswers,
  );
  if (!wrote) return null;
  return loadEpisodeById(row.id);
}

/**
 * Autosave structured (or flat) data for any client module in the token-authorized episode.
 */
export async function updateModuleData(
  token: string,
  moduleKey: string,
  data: ModuleDataPayload | AssessmentAnswers,
): Promise<ClientModuleRecord | null> {
  const resolved = await resolveModuleForToken(token, moduleKey);
  if (!resolved) return null;
  const { mod, tokenMod } = resolved;
  if (!tokenMod.consentAcceptedAt || !isModuleEditable(mod)) return null;

  const validation = validateModulePayload(moduleKey, data);
  if (!validation.ok) return null;

  const wrote =
    moduleKey === SCREENER.key
      ? await replaceModuleResponses(mod.id, validation.data as AssessmentAnswers)
      : await replaceModuleData(mod.id, validation.data);

  if (!wrote) return null;

  const refreshed = await resolveModuleForToken(token, moduleKey);
  return refreshed ? moduleToClientRecord(refreshed.mod) : null;
}

export async function getModuleByTokenAndKey(
  token: string,
  moduleKey: string,
): Promise<ClientModuleRecord | null> {
  const resolved = await resolveModuleForToken(token, moduleKey);
  if (!resolved) return null;
  return moduleToClientRecord(resolved.mod);
}

export async function submitSession(
  token: string,
  answers?: AssessmentAnswers,
): Promise<EpisodeRecord | null> {
  const resolved = await resolveModuleForToken(token, SCREENER.key);
  if (!resolved) return null;
  const { row, mod, tokenMod } = resolved;
  if (!tokenMod.consentAcceptedAt || !isModuleEditable(mod)) return null;

  const payload = answers ?? responsesToAnswers(mod.responses);
  const validation = validateModulePayload(SCREENER.key, payload);
  if (!validation.ok) return null;

  const wrote = await submitModuleResponsesLocked(
    mod.id,
    answersToRows(validation.data as AssessmentAnswers),
  );
  if (!wrote) return null;

  // Screener submission unlocks clinician findings/domains (episode leaves DRAFT).
  // Other journey modules may still be in progress — episode SUBMITTED ≠ journey complete.
  if (row.status === "DRAFT") {
    await prisma.assessmentEpisode.update({
      where: { id: row.id },
      data: { status: "SUBMITTED", submittedAt: new Date() },
    });
  }

  await logSessionEvent(row.id, "intake.submitted", {
    actorType: "client",
    metadata: { moduleKey: SCREENER.key },
  });
  return loadEpisodeById(row.id);
}

/**
 * Submit a single client module. Does not mark the episode complete by itself
 * (except screener → episode SUBMITTED to unlock clinical review — see submitSession).
 */
export async function submitModule(
  token: string,
  moduleKey: string,
  data?: ModuleDataPayload | AssessmentAnswers,
): Promise<ClientModuleRecord | null> {
  if (moduleKey === SCREENER.key) {
    const session = await submitSession(token, data as AssessmentAnswers | undefined);
    if (!session) return null;
    return getModuleByTokenAndKey(token, moduleKey);
  }

  const resolved = await resolveModuleForToken(token, moduleKey);
  if (!resolved) return null;
  const { row, mod, tokenMod } = resolved;
  if (!tokenMod.consentAcceptedAt || !isModuleEditable(mod)) return null;

  const payload = data ?? responsesToModuleData(mod.responses);
  const validation = validateModulePayload(moduleKey, payload);
  if (!validation.ok) return null;

  const wrote = await submitModuleResponsesLocked(
    mod.id,
    moduleDataToRows(validation.data),
  );
  if (!wrote) return null;

  await logSessionEvent(row.id, "module.submitted", {
    actorType: "client",
    moduleInstanceId: mod.id,
    metadata: { moduleKey },
  });

  const refreshed = await resolveModuleForToken(token, moduleKey);
  return refreshed ? moduleToClientRecord(refreshed.mod) : null;
}

/**
 * Clinician marks the episode as fully reviewed / complete (SessionStatus.REVIEWED).
 * Prefer this as the final completion signal when required modules may still be optional
 * for clinical workflow, or after all activities are in.
 */
export async function markEpisodeComplete(
  id: string,
  clinicianId: string,
): Promise<EpisodeRecord | null> {
  return updateSessionReview(id, clinicianId, { status: "REVIEWED" });
}

export async function updateSessionReview(
  id: string,
  clinicianId: string,
  input: UpdateSessionReviewInput,
): Promise<EpisodeRecord | null> {
  const existing = await prisma.assessmentEpisode.findFirst({ where: { id, clinicianId } });
  if (!existing || existing.status === "DRAFT") return null;
  if (existing.reportFinalizedAt && (input.reportDraft !== undefined || input.overrides)) {
    return null;
  }

  await prisma.assessmentEpisode.update({
    where: { id },
    data: {
      ...(input.overrides !== undefined ? { overrides: input.overrides } : {}),
      ...(input.clinicianNotes !== undefined ? { clinicianNotes: input.clinicianNotes } : {}),
      ...(input.reportDraft !== undefined ? { reportDraft: input.reportDraft } : {}),
      ...(input.reportFinal !== undefined ? { reportFinal: input.reportFinal } : {}),
      ...(input.reportFinalized
        ? {
            reportFinal: input.reportFinal ?? existing.reportDraft ?? existing.reportFinal,
            reportFinalizedAt: new Date(),
          }
        : {}),
      ...(input.status === "REVIEWED" ? { status: "REVIEWED", reviewedAt: new Date() } : {}),
    },
  });
  return loadEpisodeById(id);
}

export async function saveSessionReport(
  id: string,
  clinicianId: string,
  reportDraft: string,
  generatedAt: Date = new Date(),
): Promise<EpisodeRecord | null> {
  const existing = await prisma.assessmentEpisode.findFirst({ where: { id, clinicianId } });
  if (!existing || existing.status === "DRAFT" || existing.reportFinalizedAt) return null;

  await prisma.assessmentEpisode.update({
    where: { id },
    data: { reportDraft, reportGeneratedAt: generatedAt },
  });
  return loadEpisodeById(id);
}

export async function revokeSessionToken(
  id: string,
  clinicianId: string,
): Promise<EpisodeRecord | null> {
  const row = await prisma.assessmentEpisode.findFirst({
    where: { id, clinicianId },
    include: episodeInclude,
  });
  const clientMod = row ? screenerModule(row) : null;
  if (!row || !clientMod) return null;

  await prisma.moduleInstance.update({
    where: { id: clientMod.id },
    data: { revokedAt: new Date() },
  });
  await logSessionEvent(row.id, "session.token_revoked", {
    actorType: "clinician",
    actorId: clinicianId,
  });
  return loadEpisodeById(row.id);
}

export async function extendSessionToken(
  id: string,
  clinicianId: string,
  days = DEFAULT_TOKEN_EXPIRY_DAYS,
): Promise<EpisodeRecord | null> {
  const row = await prisma.assessmentEpisode.findFirst({
    where: { id, clinicianId },
    include: episodeInclude,
  });
  const clientMod = row ? screenerModule(row) : null;
  if (!row || !clientMod) return null;

  const tokenExpiresAt = new Date();
  tokenExpiresAt.setDate(tokenExpiresAt.getDate() + days);

  await prisma.moduleInstance.update({
    where: { id: clientMod.id },
    data: { tokenExpiresAt, revokedAt: null },
  });
  await logSessionEvent(row.id, "session.token_extended", {
    actorType: "clinician",
    actorId: clinicianId,
    metadata: { expiresAt: tokenExpiresAt.toISOString() },
  });
  return loadEpisodeById(row.id);
}

export async function markSessionNotified(id: string): Promise<void> {
  await prisma.assessmentEpisode.update({
    where: { id },
    data: { notifiedAt: new Date() },
  });
}
