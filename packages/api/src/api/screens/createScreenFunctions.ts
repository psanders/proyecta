/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { z } from "zod/v4";
import {
  createScreenSchema,
  listScreensSchema,
  ratePesosToCents,
  screenIdSchema,
  updateScreenSchema,
  withErrorHandlingAndValidation
} from "@proyecta/common";
import { DomainError } from "../../identity/errors.js";
import { logger } from "../../logger.js";
import type { ScreenDeps } from "./deps.js";
import { screenWithDevice, toScreenView, type ScreenView } from "./views.js";

const scoped = { workspaceAccessKeyId: z.string().min(1) };
const NOT_FOUND = "Pantalla no encontrada";

async function findScreen(deps: ScreenDeps, workspaceAccessKeyId: string, id: string) {
  const row = await deps.db.screen.findFirst({
    where: { id, workspaceAccessKeyId, deletedAt: null },
    include: screenWithDevice
  });
  if (!row) throw new DomainError("NOT_FOUND", NOT_FOUND);
  return row;
}

/**
 * Creates a function that adds a screen to a workspace.
 *
 * @param deps - Injected database client, event hub and clock
 */
export function createCreateScreen(deps: ScreenDeps) {
  const now = deps.now ?? (() => new Date());
  const schema = createScreenSchema.and(z.object(scoped));

  const fn = async (params: z.infer<typeof schema>): Promise<ScreenView> => {
    logger.verbose("creating screen", { workspace: params.workspaceAccessKeyId });
    const { ratePerFiveSecondsPesos, ...fields } = params;
    const row = await deps.db.screen.create({
      data: {
        ...fields,
        ratePerFiveSecondsCents:
          ratePerFiveSecondsPesos === undefined
            ? undefined
            : ratePesosToCents(ratePerFiveSecondsPesos)
      },
      include: screenWithDevice
    });
    logger.verbose("screen created", { id: row.id });
    return toScreenView(row, deps.hub, now());
  };

  return withErrorHandlingAndValidation(fn, schema);
}

/**
 * Creates a function that edits an active screen. Archived screens are read-only.
 *
 * @param deps - Injected database client, event hub and clock
 */
export function createUpdateScreen(deps: ScreenDeps) {
  const now = deps.now ?? (() => new Date());
  const schema = updateScreenSchema.and(z.object(scoped));

  const fn = async (params: z.infer<typeof schema>): Promise<ScreenView> => {
    const { id, workspaceAccessKeyId, ...fields } = params;
    const existing = await findScreen(deps, workspaceAccessKeyId, id);
    if (existing.status === "ARCHIVED") {
      throw new DomainError("PRECONDITION_FAILED", "Las pantallas archivadas no se pueden editar");
    }
    const unset = Object.fromEntries(
      (
        [
          "placeType",
          "environment",
          "address",
          "widthCm",
          "heightCm",
          "orientation",
          "resolution",
          "startTime",
          "endTime"
        ] as const
      ).map((key) => [key, fields[key] ?? null])
    );
    const row = await deps.db.screen.update({
      where: { id },
      data: {
        ...unset,
        ratePerFiveSecondsCents:
          fields.ratePerFiveSecondsPesos === undefined
            ? null
            : ratePesosToCents(fields.ratePerFiveSecondsPesos),
        name: fields.name,
        city: fields.city,
        availableDays: fields.availableDays
      },
      include: screenWithDevice
    });
    logger.verbose("screen updated", { id });
    return toScreenView(row, deps.hub, now());
  };

  return withErrorHandlingAndValidation(fn, schema);
}

export interface ScreenList {
  screens: ScreenView[];
  totals: { all: number; online: number; incomplete: number };
}

/**
 * Creates a function that lists a workspace's screens (active by default, archived on request)
 * with live status and totals. Totals always count active screens.
 *
 * @param deps - Injected database client, event hub and clock
 */
export function createListScreens(deps: ScreenDeps) {
  const now = deps.now ?? (() => new Date());
  const schema = listScreensSchema.extend(scoped);

  const fn = async (params: z.infer<typeof schema>): Promise<ScreenList> => {
    const at = now();
    const rows = await deps.db.screen.findMany({
      where: { workspaceAccessKeyId: params.workspaceAccessKeyId, deletedAt: null },
      include: screenWithDevice,
      orderBy: { createdAt: "desc" }
    });
    const views = rows.map((row) => toScreenView(row, deps.hub, at));
    const active = views.filter((v) => !v.archived);
    return {
      screens: views.filter((v) => v.archived === params.archived),
      totals: {
        all: active.length,
        online: active.filter((v) => v.status === "ONLINE").length,
        incomplete: active.filter((v) => !v.complete).length
      }
    };
  };

  return withErrorHandlingAndValidation(fn, schema);
}

/**
 * Creates a function that returns one screen of the workspace, or NOT_FOUND.
 *
 * @param deps - Injected database client, event hub and clock
 */
export function createGetScreen(deps: ScreenDeps) {
  const now = deps.now ?? (() => new Date());
  const schema = screenIdSchema.extend(scoped);

  const fn = async (params: z.infer<typeof schema>): Promise<ScreenView> =>
    toScreenView(await findScreen(deps, params.workspaceAccessKeyId, params.id), deps.hub, now());

  return withErrorHandlingAndValidation(fn, schema);
}

/**
 * Creates a function that archives (read-only, history kept) or soft-deletes a screen. Both
 * require the screen to have no linked device.
 *
 * @param deps - Injected database client and event hub
 * @param action - "archive" or "delete"
 */
export function createRetireScreen(deps: ScreenDeps, action: "archive" | "delete") {
  const now = deps.now ?? (() => new Date());
  const schema = screenIdSchema.extend(scoped);

  const fn = async (params: z.infer<typeof schema>): Promise<{ id: string }> => {
    const existing = await findScreen(deps, params.workspaceAccessKeyId, params.id);
    if (existing.bindings.length > 0) {
      throw new DomainError(
        "PRECONDITION_FAILED",
        action === "archive"
          ? "Desvincula el reproductor antes de archivar la pantalla"
          : "Desvincula el reproductor antes de eliminar la pantalla"
      );
    }
    await deps.db.screen.update({
      where: { id: params.id },
      data: action === "archive" ? { status: "ARCHIVED" } : { deletedAt: now() }
    });
    logger.verbose(`screen ${action}d`, { id: params.id });
    return { id: params.id };
  };

  return withErrorHandlingAndValidation(fn, schema);
}
