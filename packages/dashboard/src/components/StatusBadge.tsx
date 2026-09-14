/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { SCREEN_STATUS_LABELS, type ScreenStatusView } from "@proyecta/common";
import { cn } from "../lib/cn.js";

const TONES: Record<ScreenStatusView, string> = {
  ONLINE: "bg-success text-success-foreground",
  STALE: "bg-warning text-warning-foreground",
  OFFLINE: "bg-error text-error-foreground",
  UNLINKED: "bg-secondary text-muted-foreground"
};

/** Pencil Dashboard/Status Badge/{Online,Stale,Offline,Unlinked}. */
export function StatusBadge({
  status,
  className
}: {
  status: ScreenStatusView;
  className?: string;
}) {
  return (
    <span
      data-testid="status-badge"
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 font-mono text-xs font-medium",
        TONES[status],
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {SCREEN_STATUS_LABELS[status]}
    </span>
  );
}
