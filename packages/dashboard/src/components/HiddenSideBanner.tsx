/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { Link } from "react-router-dom";
import { trpc } from "../lib/trpc.js";
import { useDashboardView } from "../lib/useDashboardView.js";
import { useI18n } from "../lib/useI18n.js";
import { usePendingRequests } from "../lib/usePendingRequests.js";
import { useWorkspace } from "../lib/useWorkspace.js";
import { Button } from "./ui/Button.js";
import { Icon } from "./ui/Icon.js";

/**
 * When the view hides the screen-owner side but other businesses are waiting for a decision, says so
 * on every page instead of hiding it.
 */
export function HiddenSideBanner() {
  const { t } = useI18n();
  const { showsScreens, isLoading } = useDashboardView();
  const { canManage } = useWorkspace();
  const pending = usePendingRequests();
  const utils = trpc.useUtils();
  const showBoth = trpc.workspaces.setDashboardView.useMutation({
    onSuccess: () => void utils.workspaces.settings.invalidate()
  });

  if (isLoading || showsScreens || pending === 0) return null;
  return (
    <div
      role="status"
      className="mx-auto mb-6 flex w-full max-w-[1080px] items-center gap-3 border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground"
    >
      <Icon name="inbox" className="size-5 text-primary" />
      <span className="flex-1">
        {pending === 1 ? t("banner.requests.one") : t("banner.requests.other", { n: pending })}
      </span>
      <Link to="/requests" className="font-medium text-primary">
        {t("banner.view")}
      </Link>
      {canManage ? (
        <Button
          variant="outline"
          loading={showBoth.isPending}
          onClick={() => showBoth.mutate({ dashboardView: "BOTH" })}
        >
          {t("banner.showBoth")}
        </Button>
      ) : null}
    </div>
  );
}
