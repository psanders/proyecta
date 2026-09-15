/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { z } from "zod/v4";
import {
  approveRequestSchema,
  rejectRequestSchema,
  revokePlacementSchema,
  withErrorHandlingAndValidation
} from "@proyecta/common";
import type { DbClient } from "../../db.js";
import { DomainError } from "../../identity/errors.js";
import { logger } from "../../logger.js";
import { ownerPlacementsWhere } from "./createReviewQueries.js";

const decider = { workspaceAccessKeyId: z.string().min(1), userRef: z.string().min(1) };

export interface DecisionDeps {
  db: DbClient;
  /** Pushes updated rotations to the players of these screens. */
  notifyScreens: (screenIds: string[]) => Promise<void>;
  now?: () => Date;
}

/**
 * Loads the owner's pending placements on an ad's current file, failing when the ad isn't another
 * business's ad on the owner's screens, was cancelled, has ended, or has nothing pending.
 */
async function pendingPlacements(
  db: DbClient,
  workspaceAccessKeyId: string,
  adId: string,
  at: Date
) {
  const ad = await db.ad.findFirst({
    where: {
      id: adId,
      workspaceAccessKeyId: { not: workspaceAccessKeyId },
      placements: { some: { screen: { workspaceAccessKeyId } } }
    }
  });
  if (!ad) throw new DomainError("NOT_FOUND", "errors.review.notFound");
  if (ad.state === "CANCELED") throw new DomainError("PRECONDITION_FAILED", "errors.ad.canceled");
  if (at >= ad.endsAt) throw new DomainError("PRECONDITION_FAILED", "errors.ad.finished");
  const rows = await db.adPlacement.findMany({
    where: ownerPlacementsWhere(workspaceAccessKeyId, {
      adId,
      assetId: ad.assetId,
      status: "PENDING"
    }),
    select: { id: true, screenId: true }
  });
  if (rows.length === 0) {
    throw new DomainError("PRECONDITION_FAILED", "errors.review.nothingPending");
  }
  return rows;
}

/**
 * Creates a function that approves a request on some of the owner's pending screens. The chosen
 * placements start playing within the ad's dates; the owner's other pending screens in the request
 * are rejected as "No es apto para este lugar".
 *
 * @param deps - Injected database client, screen notifier and clock
 */
export function createApproveRequest(deps: DecisionDeps) {
  const now = deps.now ?? (() => new Date());
  const schema = approveRequestSchema.extend(decider);

  const fn = async (params: z.infer<typeof schema>): Promise<{ adId: string }> => {
    const at = now();
    const rows = await pendingPlacements(deps.db, params.workspaceAccessKeyId, params.adId, at);
    const chosen = new Set(params.screenIds);
    if (params.screenIds.some((id) => !rows.some((row) => row.screenId === id))) {
      throw new DomainError("BAD_REQUEST", "errors.review.screenNotPending");
    }
    const approve = rows.filter((row) => chosen.has(row.screenId)).map((row) => row.id);
    const decline = rows.filter((row) => !chosen.has(row.screenId)).map((row) => row.id);
    const decided = { decidedAt: at, decidedByUserRef: params.userRef };

    await deps.db.$transaction([
      deps.db.adPlacement.updateMany({
        where: { id: { in: approve }, status: "PENDING" },
        data: { status: "APPROVED", reasonCode: null, note: null, ...decided }
      }),
      deps.db.adPlacement.updateMany({
        where: { id: { in: decline }, status: "PENDING" },
        data: { status: "REJECTED", reasonCode: "NOT_SUITABLE_FOR_VENUE", ...decided }
      })
    ]);
    logger.verbose("request approved", {
      adId: params.adId,
      approved: approve.length,
      declined: decline.length
    });
    await deps.notifyScreens(params.screenIds);
    return { adId: params.adId };
  };

  return withErrorHandlingAndValidation(fn, schema);
}

/**
 * Creates a function that rejects every pending screen of a request with one reason (and a note,
 * required for "Otro"). The advertiser sees both.
 *
 * @param deps - Injected database client and clock
 */
export function createRejectRequest(deps: Omit<DecisionDeps, "notifyScreens">) {
  const now = deps.now ?? (() => new Date());
  const schema = rejectRequestSchema.and(z.object(decider));

  const fn = async (params: z.infer<typeof schema>): Promise<{ adId: string }> => {
    const at = now();
    const rows = await pendingPlacements(deps.db, params.workspaceAccessKeyId, params.adId, at);
    await deps.db.adPlacement.updateMany({
      where: { id: { in: rows.map((row) => row.id) }, status: "PENDING" },
      data: {
        status: "REJECTED",
        reasonCode: params.reason,
        note: params.note ?? null,
        decidedAt: at,
        decidedByUserRef: params.userRef
      }
    });
    logger.verbose("request rejected", { adId: params.adId, reason: params.reason });
    return { adId: params.adId };
  };

  return withErrorHandlingAndValidation(fn, schema);
}

/**
 * Creates a function that stops an approved ad on one of the owner's screens: its approved and
 * pending placements there become stopped and the ad leaves the player's rotation. Plays already
 * recorded keep their billing.
 *
 * @param deps - Injected database client, screen notifier and clock
 */
export function createRevokePlacement(deps: DecisionDeps) {
  const now = deps.now ?? (() => new Date());
  const schema = revokePlacementSchema.extend(decider);

  const fn = async (params: z.infer<typeof schema>): Promise<{ adId: string }> => {
    const at = now();
    const where = ownerPlacementsWhere(params.workspaceAccessKeyId, {
      adId: params.adId,
      screenId: params.screenId
    });
    const approved = await deps.db.adPlacement.count({ where: { ...where, status: "APPROVED" } });
    if (approved === 0) {
      const any = await deps.db.adPlacement.count({ where });
      throw any === 0
        ? new DomainError("NOT_FOUND", "errors.review.notFound")
        : new DomainError("PRECONDITION_FAILED", "errors.review.notApproved");
    }
    await deps.db.adPlacement.updateMany({
      where: { ...where, status: { in: ["APPROVED", "PENDING"] } },
      data: {
        status: "REVOKED",
        reasonCode: null,
        note: params.note ?? null,
        decidedAt: at,
        decidedByUserRef: params.userRef
      }
    });
    logger.verbose("placement revoked", { adId: params.adId, screenId: params.screenId });
    await deps.notifyScreens([params.screenId]);
    return { adId: params.adId };
  };

  return withErrorHandlingAndValidation(fn, schema);
}
