/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { isScreenComplete, type ScreenStatusView } from "@proyecta/common";
import { deriveStatus } from "../../events/status.js";
import type { EventHub } from "../../events/hub.js";
import type { Prisma } from "../../generated/prisma/client.js";

export const screenWithDevice = {
  bindings: {
    where: { unlinkedAt: null },
    include: { device: true }
  }
} satisfies Prisma.ScreenInclude;

export type ScreenRow = Prisma.ScreenGetPayload<{ include: typeof screenWithDevice }>;

export interface DeviceView {
  id: string;
  code: string;
  shell: string;
  chromiumVersion: string | null;
  resolution: string | null;
  lastSeenAt: string;
  health: Record<string, unknown> | null;
  linkedAt: string;
}

export interface ScreenView {
  id: string;
  name: string;
  placeType: string | null;
  environment: string | null;
  city: string;
  address: string | null;
  widthCm: number | null;
  heightCm: number | null;
  orientation: string | null;
  resolution: string | null;
  availableDays: number[];
  startTime: string | null;
  endTime: string | null;
  priceReference: number | null;
  priceModel: string | null;
  archived: boolean;
  complete: boolean;
  status: ScreenStatusView;
  device: DeviceView | null;
  createdAt: string;
  updatedAt: string;
}

/** Shapes a screen row for the dashboard, deriving completeness and live status. */
export function toScreenView(row: ScreenRow, hub: EventHub, now: Date): ScreenView {
  const binding = row.bindings[0];
  const device = binding?.device ?? null;
  return {
    id: row.id,
    name: row.name,
    placeType: row.placeType,
    environment: row.environment,
    city: row.city,
    address: row.address,
    widthCm: row.widthCm,
    heightCm: row.heightCm,
    orientation: row.orientation,
    resolution: row.resolution,
    availableDays: row.availableDays,
    startTime: row.startTime,
    endTime: row.endTime,
    priceReference: row.priceReference,
    priceModel: row.priceModel,
    archived: row.status === "ARCHIVED",
    complete: isScreenComplete(row),
    status: deriveStatus({
      linked: !!device,
      lastSeenAt: device?.lastSeenAt ?? null,
      streamOpen: device ? hub.isStreamOpen(device.id) : false,
      now
    }),
    device:
      device && binding
        ? {
            id: device.id,
            code: device.code,
            shell: device.shell,
            chromiumVersion: device.chromiumVersion,
            resolution: device.resolution,
            lastSeenAt: device.lastSeenAt.toISOString(),
            health: (device.health as Record<string, unknown> | null) ?? null,
            linkedAt: binding.linkedAt.toISOString()
          }
        : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}
