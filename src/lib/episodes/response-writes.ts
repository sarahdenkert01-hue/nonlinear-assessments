import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ResponseWriteOperation = "autosave" | "submit" | "clear";

export type ResponseWriteRow = {
  itemId: string;
  value: Prisma.InputJsonValue;
};

export type UpsertModuleResponsesInput = {
  moduleInstanceId: string;
  /** Rows to upsert. Omitted itemIds are left untouched. */
  rows: ResponseWriteRow[];
  /** Explicit deletes only — never inferred from omitted keys. */
  clearItemIds?: string[];
  /** Client-supplied revision; reject when it does not match server. */
  expectedRevision?: number | null;
  operation: ResponseWriteOperation;
  nextStatus: "IN_PROGRESS" | "SUBMITTED";
  submittedAt?: Date;
};

export type UpsertModuleResponsesResult =
  | {
      ok: true;
      revision: number;
      storedCountBefore: number;
      storedCountAfter: number;
      upsertedCount: number;
      clearedCount: number;
    }
  | {
      ok: false;
      code: "MODULE_MISSING" | "MODULE_LOCKED" | "REVISION_CONFLICT";
      currentRevision?: number;
      storedCountBefore?: number;
    };

export function normalizeRevision(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function snapshotFromRows(
  rows: Array<{ itemId: string; value: Prisma.JsonValue }>,
): Record<string, Prisma.JsonValue> {
  const snapshot: Record<string, Prisma.JsonValue> = {};
  for (const row of rows) {
    snapshot[row.itemId] = row.value;
  }
  return snapshot;
}

/**
 * Non-destructive write: upsert included keys, delete only explicit clearItemIds,
 * preserve omitted answers, bump revision, and record a recoverable snapshot.
 */
export async function upsertModuleResponses(
  input: UpsertModuleResponsesInput,
): Promise<UpsertModuleResponsesResult> {
  const clearItemIds = [...new Set(input.clearItemIds ?? [])].filter(Boolean);
  const upsertRows = input.rows.filter((r) => r.itemId && !clearItemIds.includes(r.itemId));

  try {
    const result = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<
        Array<{ id: string; status: string; responseRevision: number | null }>
      >`
        SELECT id, status, "responseRevision"
        FROM "ModuleInstance"
        WHERE id = ${input.moduleInstanceId}
        FOR UPDATE
      `;
      const current = locked[0];
      if (!current) {
        throw Object.assign(new Error("MODULE_MISSING"), { code: "MODULE_MISSING" as const });
      }
      if (current.status === "SUBMITTED" || current.status === "COMPLETED") {
        throw Object.assign(new Error("MODULE_LOCKED"), { code: "MODULE_LOCKED" as const });
      }

      const currentRevision = normalizeRevision(current.responseRevision);
      if (
        input.expectedRevision !== undefined &&
        input.expectedRevision !== null &&
        normalizeRevision(input.expectedRevision) !== currentRevision
      ) {
        throw Object.assign(new Error("REVISION_CONFLICT"), {
          code: "REVISION_CONFLICT" as const,
          currentRevision,
        });
      }

      const existing = await tx.response.findMany({
        where: { moduleInstanceId: input.moduleInstanceId },
        select: { itemId: true, value: true },
      });
      const storedCountBefore = existing.length;
      const previousSnapshot = snapshotFromRows(existing);

      for (const row of upsertRows) {
        await tx.response.upsert({
          where: {
            moduleInstanceId_itemId: {
              moduleInstanceId: input.moduleInstanceId,
              itemId: row.itemId,
            },
          },
          create: {
            moduleInstanceId: input.moduleInstanceId,
            itemId: row.itemId,
            value: row.value,
          },
          update: {
            value: row.value,
          },
        });
      }

      if (clearItemIds.length > 0) {
        await tx.response.deleteMany({
          where: {
            moduleInstanceId: input.moduleInstanceId,
            itemId: { in: clearItemIds },
          },
        });
      }

      const after = await tx.response.findMany({
        where: { moduleInstanceId: input.moduleInstanceId },
        select: { itemId: true },
      });
      const nextRevision = currentRevision + 1;

      await tx.responseRevision.create({
        data: {
          moduleInstanceId: input.moduleInstanceId,
          revision: nextRevision,
          operation: input.operation,
          itemIds: upsertRows.map((r) => r.itemId),
          clearItemIds,
          previousSnapshot,
        },
      });

      await tx.moduleInstance.update({
        where: { id: input.moduleInstanceId },
        data: {
          status: input.nextStatus,
          responseRevision: nextRevision,
          ...(input.submittedAt ? { submittedAt: input.submittedAt } : {}),
        },
      });

      return {
        ok: true as const,
        revision: nextRevision,
        storedCountBefore,
        storedCountAfter: after.length,
        upsertedCount: upsertRows.length,
        clearedCount: clearItemIds.length,
      };
    });

    return result;
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? (err as { code?: string }).code
        : undefined;
    if (code === "MODULE_MISSING" || code === "MODULE_LOCKED" || code === "REVISION_CONFLICT") {
      const currentRevision =
        err && typeof err === "object" && "currentRevision" in err
          ? (err as { currentRevision?: number }).currentRevision
          : undefined;
      return {
        ok: false,
        code,
        currentRevision,
      };
    }
    throw err;
  }
}
