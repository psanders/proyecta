/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useEffect } from "react";
import { canManage } from "@proyecta/common";
import { session } from "./session.js";
import { trpc } from "./trpc.js";
import { useSession } from "./useSession.js";

/**
 * The businesses the owner belongs to and the active one. Picks the first business when none
 * (or a stale one) is stored.
 */
export function useWorkspace() {
  const current = useSession();
  const workspaces = trpc.workspaces.list.useQuery(undefined, {
    enabled: !!current,
    staleTime: 60_000
  });
  const items = workspaces.data ?? [];
  const active = items.find((w) => w.accessKeyId === current?.workspace) ?? null;

  useEffect(() => {
    const first = items[0];
    if (workspaces.isSuccess && !active && first) session.update({ workspace: first.accessKeyId });
  }, [workspaces.isSuccess, active, items]);

  return {
    workspaces: items,
    active,
    /** Signed in but not part of any business (e.g. after deleting the last one). */
    hasNone: workspaces.isSuccess && items.length === 0,
    canManage: canManage(active?.role),
    isLoading: workspaces.isLoading || (workspaces.isSuccess && items.length > 0 && !active)
  };
}
