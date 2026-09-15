/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { z } from "zod/v4";
import {
  centsForPlay,
  screenIdSchema,
  withErrorHandlingAndValidation,
  type ScreenEarnings
} from "@proyecta/common";
import { DomainError } from "../../identity/errors.js";
import type { ScreenDeps } from "./deps.js";

/** America/Santo_Domingo is UTC-4 year-round (Atlantic Standard Time, no DST). */
const SANTO_DOMINGO_OFFSET_MS = 4 * 60 * 60 * 1000;

/** Start (in UTC) of the local calendar day that is `daysAgo` days before `now`'s local day. */
function startOfLocalDay(now: Date, daysAgo: number): Date {
  const local = new Date(now.getTime() - SANTO_DOMINGO_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  local.setUTCDate(local.getUTCDate() - daysAgo);
  return new Date(local.getTime() + SANTO_DOMINGO_OFFSET_MS);
}

/**
 * Creates a function that summarizes a screen's pay-per-display earnings for today and the last 7
 * days (America/Santo_Domingo calendar days), computed from billable play logs. A screen without a
 * rate has nothing meaningful to summarize.
 *
 * @param deps - Injected database client and clock
 */
export function createGetScreenEarnings(deps: ScreenDeps) {
  const now = deps.now ?? (() => new Date());
  const schema = screenIdSchema.extend({ workspaceAccessKeyId: z.string().min(1) });

  const summarize = async (screenId: string, from: Date, to: Date) => {
    const rows = await deps.db.playLog.findMany({
      where: {
        screenId,
        result: "COMPLETED",
        billedUnits: { not: null },
        startedAt: { gte: from, lt: to }
      },
      select: { billedUnits: true, rateCentsAtPlay: true }
    });
    return rows.reduce(
      (acc, row) => ({
        plays: acc.plays + 1,
        billableSeconds: acc.billableSeconds + (row.billedUnits ?? 0) * 5,
        earningsCents: acc.earningsCents + centsForPlay(row.billedUnits, row.rateCentsAtPlay)
      }),
      { plays: 0, billableSeconds: 0, earningsCents: 0 }
    );
  };

  const fn = async (params: z.infer<typeof schema>): Promise<ScreenEarnings> => {
    const screen = await deps.db.screen.findFirst({
      where: { id: params.id, workspaceAccessKeyId: params.workspaceAccessKeyId, deletedAt: null },
      select: { ratePerFiveSecondsCents: true }
    });
    if (!screen) throw new DomainError("NOT_FOUND", "Pantalla no encontrada");
    if (screen.ratePerFiveSecondsCents === null) return { available: false };

    const at = now();
    const todayStart = startOfLocalDay(at, 0);
    const tomorrowStart = startOfLocalDay(at, -1);
    const [today, last7Days] = await Promise.all([
      summarize(params.id, todayStart, tomorrowStart),
      summarize(params.id, startOfLocalDay(at, 6), tomorrowStart)
    ]);
    return { available: true, today, last7Days };
  };

  return withErrorHandlingAndValidation(fn, schema);
}
