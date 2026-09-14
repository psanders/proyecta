/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import type { ScreenStatusView } from "@proyecta/common";
import type { DeviceSyncDeps } from "../api/screens/deps.js";
import { deriveStatus } from "./status.js";

/**
 * Periodically derives the status of every linked screen and pushes transitions
 * (online → stale → offline) to dashboard viewers, since silence produces no events by itself.
 *
 * @returns A function that runs one sweep (for tests) and a stop function.
 */
export function createStatusSweeper(
  deps: Pick<DeviceSyncDeps, "db" | "hub" | "now">,
  intervalMs = 30_000
) {
  const now = deps.now ?? (() => new Date());
  const last = new Map<string, ScreenStatusView>();

  const sweep = async () => {
    const at = now();
    const bindings = await deps.db.deviceBinding.findMany({
      where: { unlinkedAt: null, screen: { deletedAt: null } },
      include: {
        device: { select: { id: true, lastSeenAt: true } },
        screen: { select: { id: true, workspaceAccessKeyId: true } }
      }
    });
    for (const binding of bindings) {
      const status = deriveStatus({
        linked: true,
        lastSeenAt: binding.device.lastSeenAt,
        streamOpen: deps.hub.isStreamOpen(binding.device.id),
        now: at
      });
      if (last.get(binding.screen.id) !== status) {
        last.set(binding.screen.id, status);
        deps.hub.publishToWorkspace(binding.screen.workspaceAccessKeyId, {
          screenId: binding.screen.id,
          status
        });
      }
    }
  };

  const timer = setInterval(() => void sweep().catch(() => undefined), intervalMs);
  timer.unref();
  return { sweep, stop: () => clearInterval(timer) };
}
