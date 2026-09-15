/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { z } from "zod/v4";
import { TIMEZONES } from "../utils/timeZone.js";
import { businessNameSchema } from "./auth.schema.js";

export const DELETE_WORKSPACE_CONFIRMATION = "ELIMINAR";

export const updateWorkspaceSettingsSchema = z.object({
  name: businessNameSchema,
  timezone: z.enum(TIMEZONES, { error: "Elige una zona horaria de la lista" })
});

export const createWorkspaceSchema = z.object({ name: businessNameSchema });

export const deleteWorkspaceSchema = z.object({
  confirmation: z
    .string()
    .trim()
    .toUpperCase()
    .refine(
      (value) => value === DELETE_WORKSPACE_CONFIRMATION,
      `Escribe ${DELETE_WORKSPACE_CONFIRMATION} para confirmar`
    )
});

export type UpdateWorkspaceSettingsInput = z.infer<typeof updateWorkspaceSettingsSchema>;

export interface WorkspaceSettingsView {
  name: string;
  timezone: string;
  /** Pay-per-display rates are always charged in US dollars. */
  currency: "USD";
  canEdit: boolean;
  isOwner: boolean;
}
