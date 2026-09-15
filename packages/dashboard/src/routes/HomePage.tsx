/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { Navigate } from "react-router-dom";
import { Icon } from "../components/ui/Icon.js";
import { useDashboardView } from "../lib/useDashboardView.js";
import { ScreensPage } from "./screens/ScreensPage.js";

/** Home follows the dashboard view: Pantallas for screen owners and both, Anuncios for advertisers. */
export function HomePage() {
  const { view, isLoading } = useDashboardView();
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Icon name="spinner" className="size-6 animate-spin" />
      </div>
    );
  }
  return view === "ADVERTISER" ? <Navigate to="/ads" replace /> : <ScreensPage />;
}
