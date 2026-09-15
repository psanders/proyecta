/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { z } from "zod/v4";
import { TIMEZONES } from "../utils/timeZone.js";
import { businessNameSchema } from "./auth.schema.js";

/** The word to type to delete a business, per language. Either is accepted. */
export const DELETE_WORKSPACE_CONFIRMATIONS = { es: "ELIMINAR", en: "DELETE" } as const;

export const updateWorkspaceSettingsSchema = z.object({
  name: businessNameSchema,
  timezone: z.enum(TIMEZONES, { error: "validation.timezone.invalid" })
});

export const createWorkspaceSchema = z.object({ name: businessNameSchema });

export const deleteWorkspaceSchema = z.object({
  confirmation: z
    .string()
    .trim()
    .toUpperCase()
    .refine(
      (value) => Object.values(DELETE_WORKSPACE_CONFIRMATIONS).some((word) => word === value),
      "validation.deleteConfirmation"
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
