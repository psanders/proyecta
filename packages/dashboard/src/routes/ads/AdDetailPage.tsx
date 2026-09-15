/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useState } from "react";
import { useParams } from "react-router-dom";
import type { AdDetail, AdScreenView } from "@proyecta/common";
import {
  AdScreenStatusBadge,
  AdStatusBadge,
  AssetStatusBadge,
  AssetThumb,
  Pill
} from "../../components/AdBadges.js";
import { BackLink, PageHeader } from "../../components/PageHeader.js";
import { ScreenPicker } from "../../components/ScreenPicker.js";
import { Alert } from "../../components/ui/Alert.js";
import { Button } from "../../components/ui/Button.js";
import { Card } from "../../components/ui/Card.js";
import { ConfirmDialog, Dialog } from "../../components/ui/Dialog.js";
import { Icon } from "../../components/ui/Icon.js";
import { cn } from "../../lib/cn.js";
import { errorMessage } from "../../lib/errors.js";
import { formatCents, formatDateRange, formatReach, formatSeconds } from "../../lib/format.js";
import type { MessageId } from "../../lib/i18n.js";
import { trpc } from "../../lib/trpc.js";
import { useI18n } from "../../lib/useI18n.js";
import { useWorkspace } from "../../lib/useWorkspace.js";

/** Pencil advertiser-ad-detail: status per screen, plays and spend, and the ad's actions. */
export function AdDetailPage() {
  const { id = "" } = useParams();
  const { t, language } = useI18n();
  const { canManage } = useWorkspace();
  const ad = trpc.ads.get.useQuery({ id }, { refetchInterval: 30_000 });
  const [dialog, setDialog] = useState<"replace" | "cancel" | "add" | null>(null);
  const [removing, setRemoving] = useState<AdScreenView | null>(null);

  if (ad.isError) {
    return (
      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-6">
        <BackLink to="/ads" label={t("adDetail.back")} />
        <Alert tone="error">{errorMessage(ad.error, t)}</Alert>
      </div>
    );
  }
  if (!ad.data) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Icon name="spinner" className="size-6 animate-spin" />
      </div>
    );
  }

  const data = ad.data;
  const editable = canManage && data.status !== "CANCELED" && data.status !== "FINISHED";
  const hasPending = data.adScreens.some(
    (s) => s.status === "PENDING_APPROVAL" || s.newFilePending
  );

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-6">
      <BackLink to="/ads" label={t("adDetail.back")} />
      <PageHeader
        title={data.name}
        badge={<AdStatusBadge status={data.status} />}
        subtitle={
          <>
            {formatDateRange(data.startDate, data.endDate, language)} ·{" "}
            {t(`assets.kind.${data.asset.kind}` as MessageId)} ·{" "}
            {formatSeconds(data.asset.durationMs)} ·{" "}
            {t(`orientation.${data.asset.orientation}` as MessageId)} ·{" "}
            {formatReach(data.screens, t)}
          </>
        }
        actions={
          editable ? (
            <>
              <Button variant="outline" onClick={() => setDialog("replace")}>
                {t("adDetail.replace")}
              </Button>
              <Button
                variant="outline"
                className="border-destructive/30 text-destructive"
                onClick={() => setDialog("cancel")}
              >
                {t("adDetail.cancel")}
              </Button>
            </>
          ) : null
        }
      />

      <div className="flex gap-4">
        <Stat label={t("adDetail.plays")} value={String(data.stats.plays)} />
        <Stat
          label={t("adDetail.spend")}
          value={formatCents(data.stats.spendCents, language)}
          hint={t("adDetail.spendHint")}
        />
        <Stat
          label={t("adDetail.housePlays")}
          value={String(data.stats.housePlays)}
          hint={t("adDetail.housePlaysHint")}
        />
      </div>

      {hasPending ? <Alert tone="info">{t("adDetail.approvalInfo")}</Alert> : null}

      <Card>
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="font-mono text-base font-medium">
            {t("adDetail.screens", { n: data.adScreens.length })}
          </h2>
          {editable ? (
            <Button variant="outline" icon="add" onClick={() => setDialog("add")}>
              {t("adDetail.addScreens")}
            </Button>
          ) : null}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-5 py-2.5 font-medium">{t("adDetail.colScreen")}</th>
              <th className="px-5 py-2.5 font-medium">{t("adDetail.colStatus")}</th>
              <th className="px-5 py-2.5 font-medium">{t("adDetail.colPlays")}</th>
              <th className="px-5 py-2.5 font-medium">{t("adDetail.colSpend")}</th>
              <th className="px-5 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {data.adScreens.map((screen) => (
              <tr
                key={screen.screenId}
                className="border-t border-border"
                data-testid="ad-screen-row"
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    {screen.name}
                    {screen.own ? <Pill tone="orange">{t("explore.own")}</Pill> : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {[
                      screen.city,
                      screen.placeType ? t(`placeType.${screen.placeType}` as MessageId) : null
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex flex-col gap-1">
                    <AdScreenStatusBadge status={screen.status} />
                    {screen.status === "PENDING_APPROVAL" ? (
                      <span className="text-xs text-muted-foreground">
                        {t("adDetail.pendingHint")}
                      </span>
                    ) : null}
                    {screen.newFilePending ? (
                      <span className="text-xs text-muted-foreground">
                        {t("adDetail.newFilePending")}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-5 py-3.5 font-mono">{screen.plays}</td>
                <td className="px-5 py-3.5 font-mono">
                  {screen.own ? t("adDetail.noCost") : formatCents(screen.spendCents, language)}
                </td>
                <td className="px-5 py-3.5 text-right">
                  {editable ? (
                    <button
                      className="text-[13px] text-destructive hover:underline"
                      onClick={() => setRemoving(screen)}
                    >
                      {t("adDetail.remove")}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="flex items-center gap-4 p-4">
        <AssetThumb poster={data.asset.poster} kind={data.asset.kind} className="h-[90px] w-40" />
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">{t("adDetail.currentFile")}</span>
          <span className="text-sm font-medium">{data.asset.name}</span>
          <span className="text-[13px] text-muted-foreground">
            {t(`assets.kind.${data.asset.kind}` as MessageId)} ·{" "}
            {formatSeconds(data.asset.durationMs)}
          </span>
        </div>
      </Card>

      {dialog === "replace" ? <ReplaceDialog ad={data} onClose={() => setDialog(null)} /> : null}
      {dialog === "add" ? <AddScreensDialog ad={data} onClose={() => setDialog(null)} /> : null}
      <CancelDialog ad={data} open={dialog === "cancel"} onClose={() => setDialog(null)} />
      {removing ? (
        <RemoveDialog ad={data} screen={removing} onClose={() => setRemoving(null)} />
      ) : null}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="flex flex-1 flex-col gap-1 px-6 py-5">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="font-mono text-[28px] leading-none font-medium">{value}</span>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </Card>
  );
}

function useInvalidateAd(id: string) {
  const utils = trpc.useUtils();
  return () => {
    void utils.ads.get.invalidate({ id });
    void utils.ads.list.invalidate();
    void utils.assets.list.invalidate();
  };
}

function ReplaceDialog({ ad, onClose }: { ad: AdDetail; onClose: () => void }) {
  const { t } = useI18n();
  const invalidate = useInvalidateAd(ad.id);
  const assets = trpc.assets.list.useQuery();
  const [assetId, setAssetId] = useState<string | null>(null);
  const replace = trpc.ads.replaceAsset.useMutation({
    onSuccess: () => {
      invalidate();
      onClose();
    }
  });
  const options = (assets.data ?? []).filter(
    (a) => a.status === "READY" && a.orientation === ad.asset.orientation && a.id !== ad.asset.id
  );

  return (
    <Dialog
      open
      title={t("adDetail.replace")}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t("dialogs.cancel")}
          </Button>
          <Button
            disabled={!assetId}
            loading={replace.isPending}
            onClick={() => assetId && replace.mutate({ id: ad.id, assetId })}
          >
            {t("adDetail.replaceConfirm")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 text-left">
        <p>{t("adDetail.replaceBody")}</p>
        {errorMessage(replace.error, t) ? (
          <Alert tone="error">{errorMessage(replace.error, t)}</Alert>
        ) : null}
        {assets.isSuccess && options.length === 0 ? <p>{t("adDetail.noReplacement")}</p> : null}
        {options.map((a) => (
          <label
            key={a.id}
            className={cn(
              "flex cursor-pointer items-center gap-3 border p-2",
              a.id === assetId ? "border-primary" : "border-border"
            )}
          >
            <input
              type="radio"
              name="replacement"
              checked={a.id === assetId}
              onChange={() => setAssetId(a.id)}
            />
            <AssetThumb poster={a.renditions.poster} kind={a.kind} className="h-10 w-16" />
            <span className="flex-1 text-sm text-foreground">{a.name}</span>
            <AssetStatusBadge status={a.status} />
          </label>
        ))}
      </div>
    </Dialog>
  );
}

function AddScreensDialog({ ad, onClose }: { ad: AdDetail; onClose: () => void }) {
  const { t } = useI18n();
  const invalidate = useInvalidateAd(ad.id);
  const catalog = trpc.ads.catalog.useQuery({});
  const [screenIds, setScreenIds] = useState<string[]>([]);
  const add = trpc.ads.addScreens.useMutation({
    onSuccess: () => {
      invalidate();
      onClose();
    }
  });
  const exclude = ad.adScreens.map((s) => s.screenId);
  const remaining = (catalog.data ?? []).filter((s) => !exclude.includes(s.id));

  return (
    <Dialog
      open
      title={t("adDetail.addScreens")}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t("dialogs.cancel")}
          </Button>
          <Button
            disabled={screenIds.length === 0}
            loading={add.isPending}
            onClick={() => add.mutate({ id: ad.id, screenIds })}
          >
            {t("adDetail.addConfirm")}
          </Button>
        </>
      }
    >
      <div className="flex max-h-[420px] flex-col gap-3 overflow-y-auto text-left">
        {errorMessage(add.error, t) ? (
          <Alert tone="error">{errorMessage(add.error, t)}</Alert>
        ) : null}
        {catalog.isSuccess && remaining.length === 0 ? <p>{t("adDetail.noMoreScreens")}</p> : null}
        <ScreenPicker
          screens={catalog.data ?? []}
          orientation={ad.asset.orientation}
          excludeIds={exclude}
          selected={screenIds}
          onToggle={(id) =>
            setScreenIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
          }
        />
      </div>
    </Dialog>
  );
}

function CancelDialog({ ad, open, onClose }: { ad: AdDetail; open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const invalidate = useInvalidateAd(ad.id);
  const cancel = trpc.ads.cancel.useMutation({
    onSuccess: () => {
      invalidate();
      onClose();
    }
  });
  return (
    <ConfirmDialog
      open={open}
      title={t("adDetail.cancelTitle", { name: ad.name })}
      body={t("adDetail.cancelBody")}
      confirmLabel={t("adDetail.cancel")}
      cancelLabel={t("adDetail.keep")}
      destructive
      loading={cancel.isPending}
      error={errorMessage(cancel.error, t)}
      onConfirm={() => cancel.mutate({ id: ad.id })}
      onClose={onClose}
    />
  );
}

function RemoveDialog({
  ad,
  screen,
  onClose
}: {
  ad: AdDetail;
  screen: AdScreenView;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const invalidate = useInvalidateAd(ad.id);
  const remove = trpc.ads.removeScreen.useMutation({
    onSuccess: () => {
      invalidate();
      onClose();
    }
  });
  return (
    <ConfirmDialog
      open
      title={t("adDetail.removeTitle", { name: screen.name })}
      body={t("adDetail.removeBody")}
      confirmLabel={t("adDetail.remove")}
      cancelLabel={t("dialogs.cancel")}
      destructive
      loading={remove.isPending}
      error={errorMessage(remove.error, t)}
      onConfirm={() => remove.mutate({ id: ad.id, screenId: screen.screenId })}
      onClose={onClose}
    />
  );
}
