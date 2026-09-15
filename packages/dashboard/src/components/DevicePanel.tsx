/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useState } from "react";
import { formatPairingCode, type ScreenStatusView } from "@proyecta/common";
import { relativeTime } from "../lib/format.js";
import { errorMessage } from "../lib/errors.js";
import { trpc } from "../lib/trpc.js";
import type { Translate } from "../lib/i18n.js";
import { useI18n } from "../lib/useI18n.js";
import { CodeInput } from "./CodeInput.js";
import { StatusBadge } from "./StatusBadge.js";
import { Alert } from "./ui/Alert.js";
import { Button } from "./ui/Button.js";
import { Icon } from "./ui/Icon.js";
import { SectionCard } from "./ui/Card.js";
import { MoreMenu } from "./ui/MoreMenu.js";

export interface DeviceData {
  code: string;
  lastSeenAt: string;
  chromiumVersion: string | null;
  health: Record<string, unknown> | null;
}

const MB = 1024;

function formatMb(mb: number): string {
  return mb >= MB ? `${Number((mb / MB).toFixed(1))} GB` : `${Math.round(mb)} MB`;
}

/** One column of the Pencil "Device Metrics" row: label, value, 8 px bar. */
function Meter({
  label,
  value,
  percent
}: {
  label: string;
  value: string;
  percent: number | null;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2" data-testid="device-metric">
      <div className="flex items-center justify-between gap-2 text-[13px]">
        <span className="truncate text-muted-foreground">{label}</span>
        <span className="shrink-0 font-semibold text-foreground">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent ?? 0}%` }} />
      </div>
    </div>
  );
}

/** Used/total meter; "—" and an empty bar when the player didn't report it. */
function capacity(
  used: unknown,
  total: unknown,
  t: Translate
): { value: string; percent: number | null } {
  if (typeof used !== "number" || typeof total !== "number" || total <= 0) {
    return { value: t("detail.notReported"), percent: null };
  }
  return {
    value: `${formatMb(used)} / ${formatMb(total)}`,
    percent: Math.min(100, (used / total) * 100)
  };
}

/** Pairing code chip with a copy-to-clipboard button (Pencil "Code Row"). */
function CodeChip({ code }: { code: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const formatted = formatPairingCode(code);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked (insecure context): the code stays selectable.
    }
  };
  return (
    <div className="flex items-center gap-2">
      <span
        className="rounded-2xl bg-secondary px-3 py-1.5 font-mono text-[13px] font-medium text-foreground select-all"
        data-testid="pairing-code"
      >
        {formatted}
      </span>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={copied ? t("detail.copied") : t("detail.copyCode")}
        title={copied ? t("detail.copied") : t("detail.copyCode")}
        className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <Icon name={copied ? "check" : "copy"} className="size-4" />
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? t("detail.copied") : ""}
      </span>
    </div>
  );
}

/** Pencil Dashboard/Device Panel: live status, last activity, code, reported health, actions. */
export function DevicePanel({
  screenId,
  status,
  device,
  canManage,
  archived,
  onUnlink,
  onArchive,
  onDelete
}: {
  screenId: string;
  status: ScreenStatusView;
  device: DeviceData | null;
  canManage: boolean;
  archived: boolean;
  onUnlink: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const utils = trpc.useUtils();
  const [code, setCode] = useState("");
  const check = trpc.screens.checkCode.useQuery(
    { code },
    { enabled: canManage && !device && code.length === 8, retry: false }
  );
  const link = trpc.screens.link.useMutation({
    onSuccess: () => {
      setCode("");
      void utils.screens.invalidate();
    }
  });
  const unavailable =
    code.length === 8 && check.data && !check.data.available
      ? t(`codeUnavailable.${check.data.reason}`)
      : null;
  const health = (device?.health ?? {}) as Record<string, number | string | undefined>;
  const linked = !!device;

  const moreMenu =
    canManage && !archived ? (
      <MoreMenu
        items={[
          {
            label: t("detail.pause"),
            icon: "pause" as const,
            onSelect: () => {},
            disabled: true,
            hint: t("detail.comingSoon")
          },
          "divider" as const,
          ...(linked
            ? [{ label: t("detail.unlink"), icon: "linkOff" as const, onSelect: onUnlink }]
            : []),
          {
            label: t("detail.archive"),
            icon: "archive" as const,
            onSelect: onArchive,
            disabled: linked,
            hint: linked ? t("dialogs.unlinkFirst") : undefined
          },
          {
            label: t("detail.remove"),
            icon: "delete" as const,
            onSelect: onDelete,
            destructive: true,
            disabled: linked,
            hint: linked ? t("dialogs.unlinkFirst") : undefined
          }
        ]}
      />
    ) : null;

  return (
    <SectionCard title={t("detail.device")} hint={t("detail.deviceHint")} actions={moreMenu}>
      {device ? (
        <>
          <div className="flex items-center gap-3">
            <StatusBadge status={status} />
            <span className="text-[13px] text-muted-foreground">
              {t("detail.lastActivity")}: {relativeTime(device.lastSeenAt, t)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">{t("detail.code")}</span>
            <CodeChip code={device.code} />
          </div>
          <div className="flex gap-6">
            <Meter
              label={t("detail.cpu")}
              {...(typeof health.cpuPercent === "number"
                ? { value: `${Math.round(health.cpuPercent)}%`, percent: health.cpuPercent }
                : { value: t("detail.notReported"), percent: null })}
            />
            <Meter
              label={t("detail.storage")}
              {...capacity(health.storageUsedMb, health.storageQuotaMb, t)}
            />
            <Meter
              label={t("detail.memory")}
              {...capacity(health.memoryUsedMb, health.memoryTotalMb, t)}
            />
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <StatusBadge status="UNLINKED" />
            <span className="text-[13px] text-muted-foreground">{t("detail.noDevice")}</span>
          </div>
          {canManage && !archived ? (
            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <div className="flex flex-col">
                <span className="text-sm font-medium">{t("detail.linkTitle")}</span>
                <span className="text-[13px] text-muted-foreground">{t("detail.linkBody")}</span>
              </div>
              <div className="flex items-center gap-3">
                <CodeInput
                  label={t("detail.linkTitle")}
                  value={code}
                  onChange={setCode}
                  error={unavailable ?? undefined}
                />
                <Button
                  icon="link"
                  disabled={!check.data?.available}
                  loading={link.isPending}
                  onClick={() => link.mutate({ screenId, code })}
                >
                  {t("detail.link")}
                </Button>
              </div>
              {unavailable ? <Alert tone="warning">{unavailable}</Alert> : null}
              {link.error ? <Alert tone="error">{errorMessage(link.error, t)}</Alert> : null}
            </div>
          ) : null}
        </>
      )}
    </SectionCard>
  );
}
