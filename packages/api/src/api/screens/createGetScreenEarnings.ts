/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { z } from "zod/v4";
import {
  centsForPlay,
  screenIdSchema,
  startOfLocalDay,
  withErrorHandlingAndValidation,
  type ScreenEarnings
} from "@proyecta/common";
import { DomainError } from "../../identity/errors.js";
import { workspaceTimeZone } from "../workspaces/createWorkspaceSettingsFunctions.js";
import type { ScreenDeps } from "./deps.js";

/**
 * Creates a function that summarizes a screen's pay-per-display earnings for today and the last 7
 * days (calendar days in the business's time zone), computed from billable play logs. A screen without a
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
    const timeZone = await workspaceTimeZone(deps.db, params.workspaceAccessKeyId);
    const todayStart = startOfLocalDay(at, timeZone);
    const tomorrowStart = startOfLocalDay(at, timeZone, 1);
    const [today, last7Days] = await Promise.all([
      summarize(params.id, todayStart, tomorrowStart),
      summarize(params.id, startOfLocalDay(at, timeZone, -6), tomorrowStart)
    ]);
    return { available: true, today, last7Days };
  };

  return withErrorHandlingAndValidation(fn, schema);
}
