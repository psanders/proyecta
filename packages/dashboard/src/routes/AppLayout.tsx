/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "../components/AppSidebar.js";
import { Icon } from "../components/ui/Icon.js";
import { useLiveStatus } from "../lib/useLiveStatus.js";
import { usePreferenceSync } from "../lib/usePreferenceSync.js";
import { useSession } from "../lib/useSession.js";
import { useWorkspace } from "../lib/useWorkspace.js";
import { CreateBusinessPage } from "./settings/CreateBusinessPage.js";

/** Signed-in shell: redirects to sign in (remembering the page) and waits for the active business. */
export function AppLayout() {
  const current = useSession();
  const location = useLocation();
  if (!current) {
    return (
      <Navigate
        to={`/sign-in?returnTo=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }
  return <SignedIn />;
}

function SignedIn() {
  const { isLoading, hasNone } = useWorkspace();
  useLiveStatus();
  usePreferenceSync();
  return (
    <div className="flex min-h-full">
      <AppSidebar />
      <main className="flex-1 px-10 py-10">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            <Icon name="spinner" className="size-6 animate-spin" />
          </div>
        ) : hasNone ? (
          <CreateBusinessPage />
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
