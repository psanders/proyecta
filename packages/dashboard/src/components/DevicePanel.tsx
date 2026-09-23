/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useState } from "react";
import { formatPairingCode, type ScreenStatusView } from "@proyecta/common";
import { relativeTime } from "../lib/format.js";
import { errorMessage } from "../lib/errors.js";
import { trpc } from "../lib/trpc.js";
import type { Translate } from "../lib/i18n.js";
import type { MessageId } from "../lib/messages/es.js";
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
  /** DeviceShell: BROWSER, ANDROID, KIOSK_LINUX or KIOSK_WINDOWS. */
  shell: string;
  lastSeenAt: string;
  chromiumVersion: string | null;
  health: Record<string, unknown> | null;
}

const MB = 1024;
const SHELLS = new Set(["BROWSER", "ANDROID", "KIOSK_LINUX", "KIOSK_WINDOWS"]);

function formatMb(mb: number): string {
  return mb >= MB ? `${Number((mb / MB).toFixed(1))} GB` : `${Math.round(mb)} MB`;
}

/** A meter's reading, or why there is none. */
type Reading = { value: string; percent: number | null; hint?: string };

/** One column of the Pencil "Device Metrics" row: label, value, 8 px bar. */
function Meter({ label, value, percent, hint }: { label: string } & Reading) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2" data-testid="device-metric" title={hint}>
      <div className="flex items-center justify-between gap-2 text-[13px]">
        <span className="truncate text-muted-foreground">{label}</span>
        <span
          className={
            percent === null
              ? "shrink-0 text-muted-foreground"
              : "shrink-0 font-semibold text-foreground"
          }
        >
          {value}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent ?? 0}%` }} />
      </div>
    </div>
  );
}

/**
 * Why a hardware figure is missing: no heartbeat yet, a plain browser (which can't read it), or a
 * shell that didn't measure it. See the `device-sync` spec.
 */
function missing(shell: string, health: Record<string, unknown> | null, t: Translate): Reading {
  if (!health) return { value: t("metric.noData"), percent: null };
  if (shell === "BROWSER") {
    return { value: t("metric.requiresApp"), percent: null, hint: t("metric.requiresAppHint") };
  }
  return { value: t("metric.unavailable"), percent: null };
}

/** Used/total reading, or the reason it's missing. */
function capacity(used: unknown, total: unknown, fallback: Reading): Reading {
  if (typeof used !== "number" || typeof total !== "number" || total <= 0) return fallback;
  return {
    value: `${formatMb(used)} / ${formatMb(total)}`,
    percent: Math.min(100, (used / total) * 100)
  };
}

/** A label/value line under the code (player type, app version, model, cache). */
function InfoRow({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-[13px]" data-testid={testId}>
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
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
  const gap = device ? missing(device.shell, device.health, t) : missing("BROWSER", null, t);
  // RAM stored before player-shells may be the page's JS heap; only a shell's figure is RAM.
  const ram = health.shellVersion ? capacity(health.memoryUsedMb, health.memoryTotalMb, gap) : gap;

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
          <div className="flex flex-col gap-1.5">
            <InfoRow
              label={t("detail.playerType")}
              value={
                SHELLS.has(device.shell) ? t(`shell.${device.shell}` as MessageId) : device.shell
              }
              testId="player-type"
            />
            {typeof health.shellVersion === "string" ? (
              <InfoRow
                label={t("detail.shellVersion")}
                value={health.shellVersion}
                testId="shell-version"
              />
            ) : null}
            {typeof health.deviceModel === "string" ? (
              <InfoRow
                label={t("detail.deviceModel")}
                value={health.deviceModel}
                testId="device-model"
              />
            ) : null}
            {typeof health.storageUsedMb === "number" &&
            typeof health.storageQuotaMb === "number" ? (
              <InfoRow
                label={t("detail.playerCache")}
                value={`${formatMb(health.storageUsedMb)} / ${formatMb(health.storageQuotaMb)}`}
                testId="player-cache"
              />
            ) : null}
          </div>
          <div className="flex gap-6">
            <Meter
              label={t("detail.cpu")}
              {...(typeof health.cpuPercent === "number"
                ? { value: `${Math.round(health.cpuPercent)}%`, percent: health.cpuPercent }
                : gap)}
            />
            <Meter label={t("detail.memory")} {...ram} />
            <Meter
              label={t("detail.disk")}
              {...capacity(health.diskUsedMb, health.diskTotalMb, gap)}
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
