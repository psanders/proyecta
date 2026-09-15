/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import {
  DEFAULT_DASHBOARD_VIEW,
  showsAds,
  showsScreens,
  type DashboardView
} from "@proyecta/common";
import { trpc } from "./trpc.js";

/**
 * The active business's dashboard view (which sides the menu shows). Presentation only: pages stay
 * reachable by address whatever the view.
 */
export function useDashboardView(): {
  view: DashboardView;
  isLoading: boolean;
  showsScreens: boolean;
  showsAds: boolean;
} {
  const settings = trpc.workspaces.settings.useQuery(undefined, { staleTime: 60_000 });
  const view = settings.data?.dashboardView ?? DEFAULT_DASHBOARD_VIEW;
  return {
    view,
    isLoading: settings.isLoading,
    showsScreens: showsScreens(view),
    showsAds: showsAds(view)
  };
}
