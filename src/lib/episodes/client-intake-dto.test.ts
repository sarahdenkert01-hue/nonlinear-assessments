import { describe, expect, it } from "vitest";
import type { ClientAssessmentEpisode, ClientModuleRecord } from "@/lib/modules";
import type { EpisodeRecord } from "./types";
import {
  CLIENT_INTAKE_FORBIDDEN_KEYS,
  findForbiddenClientIntakeKey,
  toClientIntakeDTO,
  type ClientIntakeDTO,
} from "./client-intake-dto";

const PRIVATE_NOTE = "PRIVATE_CLINICIAN_NOTE_SHOULD_NOT_LEAK";
const PRIVATE_REPORT = "PRIVATE_REPORT_DRAFT_SHOULD_NOT_LEAK";
const PRIVATE_FINAL = "PRIVATE_REPORT_FINAL_SHOULD_NOT_LEAK";
const PRIVATE_OVERRIDE_THEME = "PRIVATE_OVERRIDE_SHOULD_NOT_LEAK";

function privateEpisodeRecord(
  overrides: Partial<EpisodeRecord> = {},
): EpisodeRecord {
  return {
    id: "ep_private_sentinel",
    token: "tok_client_safe",
    clinicianId: "clin_SHOULD_NOT_LEAK",
    clientId: "client_SHOULD_NOT_LEAK",
    status: "DRAFT",
    clientName: "Alex Client",
    answers: { q01: "Often", secretScreenerLeak: "SHOULD_NOT_BE_ON_SESSION_DTO" },
    overrides: { [PRIVATE_OVERRIDE_THEME]: "include" },
    clinicianNotes: PRIVATE_NOTE,
    reportDraft: PRIVATE_REPORT,
    reportFinal: PRIVATE_FINAL,
    reportGeneratedAt: "2026-01-01T00:00:00.000Z",
    reportFinalizedAt: null,
    consentAcceptedAt: null,
    tokenExpiresAt: "2026-12-31T00:00:00.000Z",
    revokedAt: null,
    notifiedAt: "2026-01-02T00:00:00.000Z",
    submittedAt: null,
    reviewedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function sampleClientModule(): ClientModuleRecord {
  return {
    id: "mod_1",
    moduleKey: "screener",
    moduleVersion: "1",
    title: "Screener",
    description: "Client screener",
    estimatedMinutes: 20,
    required: true,
    status: "IN_PROGRESS",
    data: { q01: "Often" },
    submittedAt: null,
    responseRevision: 1,
    displayOrder: 1,
  };
}

function sampleClientEpisode(): ClientAssessmentEpisode {
  return {
    id: "ep_1",
    status: "DRAFT",
    clientName: "Alex Client",
    consentAcceptedAt: "2026-01-01T00:00:00.000Z",
    token: "tok_client_safe",
    tokenExpiresAt: "2026-12-31T00:00:00.000Z",
    revokedAt: null,
    modules: [sampleClientModule()],
    allRequiredSubmitted: false,
  };
}

describe("toClientIntakeDTO", () => {
  it("copies only allowlisted client fields", () => {
    const dto = toClientIntakeDTO(privateEpisodeRecord());
    expect(dto).toEqual({
      token: "tok_client_safe",
      clientName: "Alex Client",
      status: "DRAFT",
      consentAcceptedAt: null,
      tokenExpiresAt: "2026-12-31T00:00:00.000Z",
      revokedAt: null,
    } satisfies ClientIntakeDTO);
  });

  it("never includes clinician-only sentinel values", () => {
    const dto = toClientIntakeDTO(privateEpisodeRecord());
    const serialized = JSON.stringify({ session: dto });

    expect(serialized).not.toContain(PRIVATE_NOTE);
    expect(serialized).not.toContain(PRIVATE_REPORT);
    expect(serialized).not.toContain(PRIVATE_FINAL);
    expect(serialized).not.toContain(PRIVATE_OVERRIDE_THEME);
    expect(serialized).not.toContain("clin_SHOULD_NOT_LEAK");
    expect(serialized).not.toContain("client_SHOULD_NOT_LEAK");
    expect(serialized).not.toContain("SHOULD_NOT_BE_ON_SESSION_DTO");
    expect(findForbiddenClientIntakeKey({ session: dto })).toBeNull();
  });

  it("keeps fields the intake UI needs after consent", () => {
    const dto = toClientIntakeDTO(
      privateEpisodeRecord({
        consentAcceptedAt: "2026-01-03T12:00:00.000Z",
        status: "DRAFT",
      }),
    );
    expect(dto.token).toBe("tok_client_safe");
    expect(dto.clientName).toBe("Alex Client");
    expect(dto.consentAcceptedAt).toBe("2026-01-03T12:00:00.000Z");
    expect(dto.status).toBe("DRAFT");
  });

  it("does not pick up extra EpisodeRecord keys via spread", () => {
    const dto = toClientIntakeDTO(privateEpisodeRecord());
    expect(Object.keys(dto).sort()).toEqual(
      [
        "clientName",
        "consentAcceptedAt",
        "revokedAt",
        "status",
        "token",
        "tokenExpiresAt",
      ].sort(),
    );
  });
});

describe("client-facing intake payload shapes", () => {
  it("flags forbidden keys when a full EpisodeRecord is returned by mistake", () => {
    const leaky = { session: privateEpisodeRecord() };
    const hit = findForbiddenClientIntakeKey(leaky);
    expect(hit).toBeTruthy();
    expect(hit).toMatch(/reportDraft|clinicianNotes|overrides|clinicianId/);
  });

  it("allows ClientAssessmentEpisode journey payloads", () => {
    const payload = { episode: sampleClientEpisode() };
    expect(findForbiddenClientIntakeKey(payload)).toBeNull();
    expect(JSON.stringify(payload)).toContain("Alex Client");
    expect(JSON.stringify(payload)).toContain("tok_client_safe");
    expect(JSON.stringify(payload)).toContain("q01");
  });

  it("allows ClientModuleRecord module API payloads", () => {
    const payload = { module: sampleClientModule() };
    expect(findForbiddenClientIntakeKey(payload)).toBeNull();
  });

  it("documents the forbidden key allowlist used by security checks", () => {
    expect(CLIENT_INTAKE_FORBIDDEN_KEYS).toEqual(
      expect.arrayContaining([
        "reportDraft",
        "reportFinal",
        "clinicianNotes",
        "overrides",
        "clinicianId",
        "diagnosticImpressions",
      ]),
    );
  });
});
