/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import type { DeviceShell } from "../schemas/device.schema.js";

export interface Device {
  id: string;
  code: string;
  hwId: string;
  shell: DeviceShell;
  chromiumVersion: string | null;
  resolution: string | null;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterDeviceResult {
  /** Canonical pairing code, e.g. "8F3K2QLM". */
  code: string;
  /** Bearer credential for every other /device/v1 call. Returned only here; stored hashed. */
  deviceToken: string;
  /** True when this call minted the code; false when the hardware id was already known. */
  created: boolean;
}

/**
 * The subset of the database client that device functions need.
 * Structurally satisfied by the Prisma client; stubbed with sinon in tests.
 */
export interface DeviceDbClient {
  device: {
    findUnique(args: { where: { hwId: string } }): Promise<Device | null>;
    update(args: {
      where: { id: string };
      data: Partial<Pick<Device, "shell" | "chromiumVersion" | "resolution" | "lastSeenAt">> & {
        tokenHash?: string;
      };
    }): Promise<Device>;
    create(args: {
      data: Pick<Device, "code" | "hwId" | "shell"> &
        Partial<Pick<Device, "chromiumVersion" | "resolution">> & { tokenHash?: string };
    }): Promise<Device>;
  };
}
