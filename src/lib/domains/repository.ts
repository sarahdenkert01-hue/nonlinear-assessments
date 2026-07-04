import type { Prisma } from "@prisma/client";
import { logSessionEvent } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { computeSuggestedGaps } from "./gaps";
import { getAllDomains, getDomainById, getDomainsForTheme } from "./registry";
import type {
  DomainDetail,
  DomainEvidenceItem,
  DomainFindingRef,
  DomainSummary,
  EvidenceSourceType,
  UpdateDomainReviewInput,
} from "./types";

const CONFIRMED_STATUSES = ["ACCEPTED", "EDITED"] as const;

type ReviewWithEvidence = Prisma.DomainReviewGetPayload<{ include: { evidence: true } }>;

function toSourceTypes(evidence: { sourceType: EvidenceSourceType }[]): EvidenceSourceType[] {
  return [...new Set(evidence.map((e) => e.sourceType))];
}

function buildSummary(review: ReviewWithEvidence | null, domainId: string): DomainSummary {
  const domain = getDomainById(domainId)!;
  const evidence = review?.evidence ?? [];
  const findingEvidence = evidence.filter((e) => e.findingId);
  const sourceTypes = toSourceTypes(evidence);
  const hasAnyEvidence = evidence.length > 0;

  return {
    domainId,
    label: domain.label,
    description: domain.description,
    confirmedFindingCount: findingEvidence.length,
    evidenceCount: evidence.length,
    sourceTypes,
    suggestedGaps: computeSuggestedGaps(domainId, sourceTypes, hasAnyEvidence),
    confidence: review?.confidence ?? null,
    reviewedAt: review?.reviewedAt?.toISOString() ?? null,
    hasConfirmedFindings: findingEvidence.length > 0,
  };
}

// Sync domain evidence from confirmed findings (ACCEPTED/EDITED only). Idempotent.
export async function ensureDomainEvidenceForEpisode(episodeId: string): Promise<void> {
  const confirmed = await prisma.finding.findMany({
    where: { episodeId, status: { in: [...CONFIRMED_STATUSES] } },
    select: { id: true, code: true, moduleInstanceId: true },
  });

  const domainToFindings = new Map<string, typeof confirmed>();
  for (const finding of confirmed) {
    for (const domainId of getDomainsForTheme(finding.code)) {
      const list = domainToFindings.get(domainId) ?? [];
      list.push(finding);
      domainToFindings.set(domainId, list);
    }
  }

  for (const [domainId, findings] of domainToFindings) {
    const review = await prisma.domainReview.upsert({
      where: { episodeId_domainId: { episodeId, domainId } },
      create: { episodeId, domainId },
      update: {},
    });

    for (const finding of findings) {
      await prisma.domainEvidence.upsert({
        where: {
          domainReviewId_findingId: {
            domainReviewId: review.id,
            findingId: finding.id,
          },
        },
        create: {
          domainReviewId: review.id,
          sourceType: "FINDING",
          findingId: finding.id,
          moduleInstanceId: finding.moduleInstanceId,
        },
        update: {},
      });
    }
  }
}

export async function listDomainSummariesForEpisode(
  episodeId: string,
): Promise<DomainSummary[]> {
  await ensureDomainEvidenceForEpisode(episodeId);

  const reviews = await prisma.domainReview.findMany({
    where: { episodeId },
    include: { evidence: true },
  });
  const reviewByDomain = new Map(reviews.map((r) => [r.domainId, r]));

  return getAllDomains().map((domain) =>
    buildSummary(reviewByDomain.get(domain.id) ?? null, domain.id),
  );
}

async function loadFindingRefs(findingIds: string[]): Promise<Map<string, DomainFindingRef>> {
  if (findingIds.length === 0) return new Map();

  const findings = await prisma.finding.findMany({
    where: { id: { in: findingIds } },
    include: { _count: { select: { evidence: true } } },
  });

  return new Map(
    findings.map((f) => [
      f.id,
      {
        id: f.id,
        code: f.code,
        label: f.label,
        status: f.status,
        hits: f.hits,
        total: f.total,
        evidenceCount: f._count.evidence,
      },
    ]),
  );
}

function buildEvidenceItems(
  evidence: ReviewWithEvidence["evidence"],
  findingRefs: Map<string, DomainFindingRef>,
): DomainEvidenceItem[] {
  return evidence.map((e) => ({
    id: e.id,
    sourceType: e.sourceType as EvidenceSourceType,
    findingId: e.findingId,
    findingLabel: e.findingId ? (findingRefs.get(e.findingId)?.label ?? null) : null,
    responseId: e.responseId,
    itemId: e.itemId,
    excerpt: e.excerpt,
  }));
}

export async function getDomainDetailForEpisode(
  episodeId: string,
  domainId: string,
): Promise<DomainDetail | null> {
  if (!getDomainById(domainId)) return null;

  await ensureDomainEvidenceForEpisode(episodeId);

  const review = await prisma.domainReview.findUnique({
    where: { episodeId_domainId: { episodeId, domainId } },
    include: { evidence: true },
  });

  const summary = buildSummary(review, domainId);
  const findingIds = (review?.evidence ?? [])
    .map((e) => e.findingId)
    .filter((id): id is string => Boolean(id));
  const findingRefs = await loadFindingRefs(findingIds);
  const findings = findingIds
    .map((id) => findingRefs.get(id))
    .filter((f): f is DomainFindingRef => Boolean(f));

  return {
    ...summary,
    alternativeExplanations: review?.alternativeExplanations ?? [],
    clinicalNotes: review?.clinicalNotes ?? null,
    evidenceGapNotes: review?.evidenceGapNotes ?? null,
    summaryDraft: review?.summaryDraft ?? null,
    findings,
    evidence: buildEvidenceItems(review?.evidence ?? [], findingRefs),
  };
}

export async function updateDomainReview(
  episodeId: string,
  domainId: string,
  clinicianId: string,
  input: UpdateDomainReviewInput,
): Promise<DomainDetail | null> {
  if (!getDomainById(domainId)) return null;

  const episode = await prisma.assessmentEpisode.findFirst({
    where: { id: episodeId, clinicianId },
  });
  if (!episode) return null;

  await ensureDomainEvidenceForEpisode(episodeId);

  await prisma.domainReview.upsert({
    where: { episodeId_domainId: { episodeId, domainId } },
    create: {
      episodeId,
      domainId,
      ...(input.confidence !== undefined ? { confidence: input.confidence } : {}),
      ...(input.alternativeExplanations !== undefined
        ? { alternativeExplanations: input.alternativeExplanations }
        : {}),
      ...(input.clinicalNotes !== undefined ? { clinicalNotes: input.clinicalNotes } : {}),
      ...(input.evidenceGapNotes !== undefined
        ? { evidenceGapNotes: input.evidenceGapNotes }
        : {}),
      ...(input.summaryDraft !== undefined ? { summaryDraft: input.summaryDraft } : {}),
      ...(input.reviewed === true ? { reviewedAt: new Date() } : {}),
      ...(input.reviewed === false ? { reviewedAt: null } : {}),
    },
    update: {
      ...(input.confidence !== undefined ? { confidence: input.confidence } : {}),
      ...(input.alternativeExplanations !== undefined
        ? { alternativeExplanations: input.alternativeExplanations }
        : {}),
      ...(input.clinicalNotes !== undefined ? { clinicalNotes: input.clinicalNotes } : {}),
      ...(input.evidenceGapNotes !== undefined
        ? { evidenceGapNotes: input.evidenceGapNotes }
        : {}),
      ...(input.summaryDraft !== undefined ? { summaryDraft: input.summaryDraft } : {}),
      ...(input.reviewed === true ? { reviewedAt: new Date() } : {}),
      ...(input.reviewed === false ? { reviewedAt: null } : {}),
    },
  });

  await logSessionEvent(episodeId, "review.domain_updated", {
    actorType: "clinician",
    actorId: clinicianId,
    metadata: { domainId },
  });

  return getDomainDetailForEpisode(episodeId, domainId);
}

export async function addManualDomainEvidence(
  episodeId: string,
  domainId: string,
  clinicianId: string,
  excerpt: string,
): Promise<DomainDetail | null> {
  if (!getDomainById(domainId)) return null;

  const episode = await prisma.assessmentEpisode.findFirst({
    where: { id: episodeId, clinicianId },
  });
  if (!episode) return null;

  const review = await prisma.domainReview.upsert({
    where: { episodeId_domainId: { episodeId, domainId } },
    create: { episodeId, domainId },
    update: {},
  });

  await prisma.domainEvidence.create({
    data: {
      domainReviewId: review.id,
      sourceType: "MANUAL_NOTE",
      excerpt: excerpt.trim(),
    },
  });

  await logSessionEvent(episodeId, "review.domain_evidence_added", {
    actorType: "clinician",
    actorId: clinicianId,
    metadata: { domainId, sourceType: "MANUAL_NOTE" },
  });

  return getDomainDetailForEpisode(episodeId, domainId);
}

/** Count confirmed findings for navigation hints. */
export async function countConfirmedFindings(episodeId: string): Promise<number> {
  return prisma.finding.count({
    where: { episodeId, status: { in: [...CONFIRMED_STATUSES] } },
  });
}
