/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { trpc } from "./trpc.js";

/** The active business's pending request count, refreshed every 30 seconds. */
export function usePendingRequests(): number {
  const pending = trpc.adReview.pendingCount.useQuery(undefined, {
    refetchInterval: 30_000,
    staleTime: 10_000
  });
  return pending.data?.count ?? 0;
}
