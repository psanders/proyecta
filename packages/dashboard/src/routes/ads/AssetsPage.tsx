/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useRef, useState } from "react";
import {
  IMAGE_DURATIONS_MS,
  VIDEO_TYPES,
  IMAGE_TYPES,
  assetKindForType,
  type AssetView
} from "@proyecta/common";
import { AssetStatusBadge, AssetThumb, Pill } from "../../components/AdBadges.js";
import { EmptyState, PageHeader } from "../../components/PageHeader.js";
import { Alert } from "../../components/ui/Alert.js";
import { Button } from "../../components/ui/Button.js";
import { Card } from "../../components/ui/Card.js";
import { ConfirmDialog, Dialog } from "../../components/ui/Dialog.js";
import { SelectField, TextField } from "../../components/ui/Field.js";
import { errorMessage, fieldErrors } from "../../lib/errors.js";
import { formatSeconds } from "../../lib/format.js";
import type { MessageId } from "../../lib/i18n.js";
import { trpc } from "../../lib/trpc.js";
import { uploadAsset } from "../../lib/uploadAsset.js";
import { useI18n } from "../../lib/useI18n.js";
import { useWorkspace } from "../../lib/useWorkspace.js";

const ACCEPT = [...Object.keys(VIDEO_TYPES), ...Object.keys(IMAGE_TYPES)].join(",");

/** Pencil advertiser-assets-v2: the business's files, with upload and automated-check errors. */
export function AssetsPage() {
  const { t } = useI18n();
  const { canManage } = useWorkspace();
  const input = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<File | null>(null);
  const assets = trpc.assets.list.useQuery(undefined, {
    // Keep polling while any file is still being prepared.
    refetchInterval: (query) =>
      query.state.data?.some((a) => a.status === "PROCESSING") ? 2000 : false
  });

  const upload = canManage ? (
    <>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="hidden"
        data-testid="asset-file-input"
        onChange={(e) => {
          setPicked(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
      <Button icon="upload" onClick={() => input.current?.click()}>
        {t("assets.upload")}
      </Button>
    </>
  ) : null;

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-6">
      <PageHeader title={t("assets.title")} subtitle={t("assets.subtitle")} actions={upload} />
      <Alert tone="info">{t("assets.formats")}</Alert>
      {assets.isError ? <Alert tone="error">{t("assets.loadError")}</Alert> : null}
      {assets.isSuccess && assets.data.length === 0 ? (
        <EmptyState title={t("assets.emptyTitle")} body={t("assets.emptyBody")} action={null} />
      ) : null}
      <div className="grid grid-cols-3 gap-4">
        {(assets.data ?? []).map((asset) => (
          <AssetCard key={asset.id} asset={asset} canManage={canManage} />
        ))}
      </div>
      {picked ? <UploadDialog file={picked} onClose={() => setPicked(null)} /> : null}
    </div>
  );
}

function AssetCard({ asset, canManage }: { asset: AssetView; canManage: boolean }) {
  const { t } = useI18n();
  const utils = trpc.useUtils();
  const [confirming, setConfirming] = useState(false);
  const remove = trpc.assets.delete.useMutation({
    onSuccess: () => {
      setConfirming(false);
      void utils.assets.list.invalidate();
    }
  });
  const meta = [
    t(`assets.kind.${asset.kind}` as MessageId),
    formatSeconds(asset.durationMs),
    `${asset.width}×${asset.height}`,
    t(`orientation.${asset.orientation}` as MessageId)
  ].join(" · ");

  return (
    <Card className="flex flex-col">
      <AssetThumb poster={asset.renditions.poster} kind={asset.kind} className="h-[170px]" />
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-foreground">{asset.name}</span>
          <AssetStatusBadge status={asset.status} />
        </div>
        <span className="text-xs text-muted-foreground">{meta}</span>
        {asset.status === "FAILED" ? (
          <span className="text-xs text-warning-foreground">{t("assets.failed")}</span>
        ) : null}
        <div className="flex items-center justify-between">
          {asset.inUse ? <Pill tone="muted">{t("assets.inUse")}</Pill> : <span />}
          {canManage && !asset.inUse ? (
            <button
              className="text-[13px] text-destructive hover:underline"
              onClick={() => setConfirming(true)}
            >
              {t("assets.delete")}
            </button>
          ) : null}
        </div>
      </div>
      {confirming ? (
        <ConfirmDialog
          open
          title={t("assets.deleteTitle", { name: asset.name })}
          body={t("assets.deleteBody")}
          confirmLabel={t("assets.delete")}
          cancelLabel={t("dialogs.cancel")}
          destructive
          loading={remove.isPending}
          error={errorMessage(remove.error, t)}
          onConfirm={() => remove.mutate({ id: asset.id })}
          onClose={() => setConfirming(false)}
        />
      ) : null}
    </Card>
  );
}

/** Name (and, for images, the time on screen) before sending the file. */
function UploadDialog({ file, onClose }: { file: File; onClose: () => void }) {
  const { t } = useI18n();
  const utils = trpc.useUtils();
  const isImage = assetKindForType(file.type) === "IMAGE";
  const [name, setName] = useState(file.name.replace(/\.[^.]+$/, ""));
  const [durationMs, setDurationMs] = useState<number>(IMAGE_DURATIONS_MS[1]);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await uploadAsset({ file, name, durationMs: isImage ? durationMs : undefined });
      await utils.assets.list.invalidate();
      onClose();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  const errors = fieldErrors(error);

  return (
    <Dialog
      open
      title={t("assets.uploadTitle", { file: file.name })}
      onClose={() => (busy ? undefined : onClose())}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            {t("dialogs.cancel")}
          </Button>
          <Button loading={busy} onClick={() => void submit()}>
            {t("assets.uploadSubmit")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-left">
        {errorMessage(error, t) ? <Alert tone="error">{errorMessage(error, t)}</Alert> : null}
        {errors.file ? <Alert tone="error">{errors.file}</Alert> : null}
        <TextField
          label={t("assets.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />
        {isImage ? (
          <SelectField
            label={t("assets.duration")}
            value={String(durationMs)}
            onChange={(e) => setDurationMs(Number(e.target.value))}
            error={errors.durationMs}
            options={IMAGE_DURATIONS_MS.map((ms) => ({
              value: String(ms),
              label: t("assets.durationOption", { n: ms / 1000 })
            }))}
          />
        ) : null}
      </div>
    </Dialog>
  );
}
