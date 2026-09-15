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

/** Which sides of the dashboard a business sees. Presentation only: never gates access or billing. */
export const DASHBOARD_VIEWS = ["SCREEN_OWNER", "ADVERTISER", "BOTH"] as const;
export type DashboardView = (typeof DASHBOARD_VIEWS)[number];
export const DEFAULT_DASHBOARD_VIEW: DashboardView = "SCREEN_OWNER";

export const dashboardViewSchema = z.enum(DASHBOARD_VIEWS, {
  error: "validation.dashboardView.invalid"
});
export const setDashboardViewSchema = z.object({ dashboardView: dashboardViewSchema });

/** True when the view shows the screen-owner side (Pantallas). */
export function showsScreens(view: DashboardView): boolean {
  return view !== "ADVERTISER";
}

/** True when the view shows the advertiser side (Buscar pantallas, Anuncios, Recursos). */
export function showsAds(view: DashboardView): boolean {
  return view !== "SCREEN_OWNER";
}

export const createWorkspaceSchema = z.object({
  name: businessNameSchema,
  dashboardView: dashboardViewSchema.optional()
});

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
  dashboardView: DashboardView;
  /** Pay-per-display rates are always charged in US dollars. */
  currency: "USD";
  canEdit: boolean;
  isOwner: boolean;
}

/** What keeps running on each side of a business, for the view-switch confirmation. */
export interface WorkspaceActivity {
  /** Screens with a linked player. */
  linkedScreens: number;
  /** Ads that are on air or scheduled. */
  activeAds: number;
}
