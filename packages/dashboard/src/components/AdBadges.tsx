/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import type { AdScreenStatus, AdStatus, AssetStatus } from "@proyecta/common";
import { cn } from "../lib/cn.js";
import type { MessageId } from "../lib/i18n.js";
import { useI18n } from "../lib/useI18n.js";
import { Icon } from "./ui/Icon.js";

type Tone = "success" | "warning" | "info" | "muted" | "orange";

const TONES: Record<Tone, string> = {
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  info: "bg-info text-info-foreground",
  muted: "bg-secondary text-muted-foreground",
  orange: "bg-primary/15 text-primary"
};

/** Pill badge used across the advertiser pages. */
export function Pill({ tone, children }: { tone: Tone; children: string }) {
  return (
    <span
      data-testid="pill"
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs leading-none font-medium whitespace-nowrap",
        TONES[tone]
      )}
    >
      {children}
    </span>
  );
}

const STATUS_TONE: Record<AdStatus | AdScreenStatus, Tone> = {
  ON_AIR: "success",
  SCHEDULED: "info",
  PENDING_APPROVAL: "warning",
  FINISHED: "muted",
  CANCELED: "muted",
  NO_SCREENS: "muted",
  NOT_APPROVED: "muted"
};

/** An ad's overall status. */
export function AdStatusBadge({ status }: { status: AdStatus }) {
  const { t } = useI18n();
  return <Pill tone={STATUS_TONE[status]}>{t(`adStatus.${status}` as MessageId)}</Pill>;
}

/** One screen's status within an ad. */
export function AdScreenStatusBadge({ status }: { status: AdScreenStatus }) {
  const { t } = useI18n();
  return <Pill tone={STATUS_TONE[status]}>{t(`adScreenStatus.${status}` as MessageId)}</Pill>;
}

const ASSET_TONE: Record<AssetStatus, Tone> = {
  READY: "success",
  PROCESSING: "info",
  FAILED: "warning"
};

export function AssetStatusBadge({ status }: { status: AssetStatus }) {
  const { t } = useI18n();
  return <Pill tone={ASSET_TONE[status]}>{t(`assets.status.${status}` as MessageId)}</Pill>;
}

/** A file's still (poster) or a kind icon while it has none. */
export function AssetThumb({
  poster,
  kind,
  className
}: {
  poster: string | null | undefined;
  kind: "IMAGE" | "VIDEO";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden bg-secondary text-muted-foreground",
        className
      )}
    >
      {poster ? (
        <img src={poster} alt="" className="size-full object-cover" />
      ) : (
        <Icon name={kind === "VIDEO" ? "playCircle" : "image"} className="size-6" />
      )}
    </div>
  );
}
