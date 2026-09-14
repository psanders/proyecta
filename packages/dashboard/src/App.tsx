/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { strings } from "./strings.js";
import { trpc } from "./trpc.js";

export function App() {
  const health = trpc.health.useQuery(undefined, { retry: false });
  const status = health.isLoading
    ? strings.apiChecking
    : health.data?.ok
      ? strings.apiOnline
      : strings.apiOffline;

  return (
    <main className="mx-auto max-w-3xl p-8 font-sans">
      <p className="text-sm text-neutral-500">{strings.appName}</p>
      <h1 className="text-2xl font-semibold">{strings.panelTitle}</h1>
      <p className="mt-4 text-sm" data-testid="api-status">
        {status}
      </p>
    </main>
  );
}
