/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useState } from "react";
import {
  CODE_UNAVAILABLE_MESSAGES,
  formatPairingCode,
  type ScreenStatusView
} from "@proyecta/common";
import { formatDuration, relativeTime } from "../lib/format.js";
import { errorMessage } from "../lib/errors.js";
import { trpc } from "../lib/trpc.js";
import { strings } from "../strings.js";
import { CodeInput } from "./CodeInput.js";
import { KeyValueRow } from "./PageHeader.js";
import { StatusBadge } from "./StatusBadge.js";
import { Alert } from "./ui/Alert.js";
import { Button } from "./ui/Button.js";
import { SectionCard } from "./ui/Card.js";

export interface DeviceData {
  code: string;
  lastSeenAt: string;
  chromiumVersion: string | null;
  health: Record<string, unknown> | null;
}

function Meter({ label, used, total }: { label: string; used?: number; total?: number }) {
  if (used === undefined || !total) return null;
  const pct = Math.min(100, Math.round((used / total) * 100));
  const fmt = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`);
  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="flex justify-between text-[13px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">
          {fmt(used)} / {fmt(total)}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
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
  onUnlink
}: {
  screenId: string;
  status: ScreenStatusView;
  device: DeviceData | null;
  canManage: boolean;
  archived: boolean;
  onUnlink: () => void;
}) {
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
      ? CODE_UNAVAILABLE_MESSAGES[check.data.reason]
      : null;
  const health = (device?.health ?? {}) as Record<string, number | string | undefined>;

  return (
    <SectionCard title={strings.detail.device} hint={strings.detail.deviceHint}>
      {device ? (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusBadge status={status} />
              <span className="text-[13px] text-muted-foreground">
                {strings.detail.lastActivity}: {relativeTime(device.lastSeenAt)}
              </span>
            </div>
            {canManage ? (
              <Button variant="outline" icon="linkOff" onClick={onUnlink}>
                {strings.detail.unlink}
              </Button>
            ) : null}
          </div>
          <KeyValueRow
            label={strings.detail.code}
            value={
              <span className="rounded-full bg-secondary px-3 py-1 font-mono text-sm font-bold tracking-widest">
                {formatPairingCode(device.code)}
              </span>
            }
          />
          {health.playerVersion ? (
            <KeyValueRow
              label={strings.detail.version}
              value={<span className="font-mono">{String(health.playerVersion)}</span>}
            />
          ) : null}
          {health.codec ? (
            <KeyValueRow
              label={strings.detail.codec}
              value={<span className="font-mono uppercase">{String(health.codec)}</span>}
            />
          ) : null}
          {typeof health.uptimeSec === "number" ? (
            <KeyValueRow label={strings.detail.uptime} value={formatDuration(health.uptimeSec)} />
          ) : null}
          <div className="flex gap-6">
            <Meter
              label={strings.detail.memory}
              used={health.memoryUsedMb as number | undefined}
              total={health.memoryTotalMb as number | undefined}
            />
            <Meter
              label={strings.detail.storage}
              used={health.storageUsedMb as number | undefined}
              total={health.storageQuotaMb as number | undefined}
            />
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <StatusBadge status="UNLINKED" />
            <span className="text-[13px] text-muted-foreground">{strings.detail.noDevice}</span>
          </div>
          {canManage && !archived ? (
            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <div className="flex flex-col">
                <span className="text-sm font-medium">{strings.detail.linkTitle}</span>
                <span className="text-[13px] text-muted-foreground">{strings.detail.linkBody}</span>
              </div>
              <div className="flex items-center gap-3">
                <CodeInput
                  label={strings.detail.linkTitle}
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
                  {strings.detail.link}
                </Button>
              </div>
              {unavailable ? <Alert tone="warning">{unavailable}</Alert> : null}
              {link.error ? <Alert tone="error">{errorMessage(link.error)}</Alert> : null}
            </div>
          ) : null}
        </>
      )}
    </SectionCard>
  );
}
