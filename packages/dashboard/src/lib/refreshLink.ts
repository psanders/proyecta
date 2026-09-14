/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { TRPCClientError, type TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import type { AppRouter } from "@proyecta/api/router";
import type { SessionStore } from "./session.js";

type Refresh = (refreshToken: string) => Promise<{ accessToken: string; refreshToken: string }>;

/**
 * Retries a request once after renewing the session when it fails as UNAUTHORIZED. Concurrent
 * failures share one refresh. If renewal fails the session is cleared (the app shows sign in).
 */
export function createRefreshLink(store: SessionStore, refresh: Refresh): TRPCLink<AppRouter> {
  let inFlight: Promise<boolean> | null = null;

  const renew = () => {
    inFlight ??= (async () => {
      const current = store.get();
      if (!current) return false;
      try {
        const next = await refresh(current.refreshToken);
        store.update(next);
        return true;
      } catch {
        store.set(null);
        return false;
      } finally {
        setTimeout(() => (inFlight = null), 0);
      }
    })();
    return inFlight;
  };

  return () =>
    ({ op, next }) =>
      observable((observer) => {
        let retried = false;
        let subscription: { unsubscribe: () => void } | undefined;
        const attempt = () => {
          subscription = next(op).subscribe({
            next: (value) => observer.next(value),
            complete: () => observer.complete(),
            error: (err) => {
              const unauthorized =
                err instanceof TRPCClientError && err.data?.code === "UNAUTHORIZED";
              if (!unauthorized || retried || op.path.startsWith("auth.") || !store.get()) {
                observer.error(err);
                return;
              }
              retried = true;
              void renew().then((ok) => (ok ? attempt() : observer.error(err)));
            }
          });
        };
        attempt();
        return () => subscription?.unsubscribe();
      });
}
