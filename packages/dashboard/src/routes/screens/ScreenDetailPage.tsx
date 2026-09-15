/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Environment, Orientation, PlaceType } from "@proyecta/common";
import { DayPicker } from "../../components/DayPicker.js";
import { DevicePanel } from "../../components/DevicePanel.js";
import { BackLink, KeyValueRow, PageHeader } from "../../components/PageHeader.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import { Alert } from "../../components/ui/Alert.js";
import { Button } from "../../components/ui/Button.js";
import { SectionCard } from "../../components/ui/Card.js";
import { ConfirmDialog } from "../../components/ui/Dialog.js";
import { Icon } from "../../components/ui/Icon.js";
import { errorMessage } from "../../lib/errors.js";
import { formatCents, formatPlays, formatTime12 } from "../../lib/format.js";
import { trpc } from "../../lib/trpc.js";
import { useWorkspace } from "../../lib/useWorkspace.js";
import { useI18n } from "../../lib/useI18n.js";
import { ScreenAdsCard } from "../../components/ScreenAdsCard.js";

type Pending = "unlink" | "archive" | "delete" | null;

/** Pencil frame screen-detail with the lifecycle dialogs. */
export function ScreenDetailPage() {
  const { t, language } = useI18n();
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { canManage } = useWorkspace();
  const screen = trpc.screens.get.useQuery({ id }, { refetchInterval: 60_000 });
  const earnings = trpc.screens.earnings.useQuery({ id }, { refetchInterval: 60_000 });
  const [pending, setPending] = useState<Pending>(null);
  const done = () => {
    setPending(null);
    void utils.screens.invalidate();
  };
  const unlink = trpc.screens.unlink.useMutation({ onSuccess: done });
  const archive = trpc.screens.archive.useMutation({ onSuccess: () => (done(), navigate("/")) });
  const remove = trpc.screens.delete.useMutation({ onSuccess: () => (done(), navigate("/")) });

  if (screen.isLoading)
    return <Icon name="spinner" className="size-6 animate-spin text-muted-foreground" />;
  if (!screen.data)
    return <Alert tone="error">{errorMessage(screen.error, t) ?? t("errors.notFound")}</Alert>;
  const s = screen.data;
  const na = t("detail.notSet");
  const place = s.placeType ? t(`placeType.${s.placeType as PlaceType}`) : null;

  const dialogs = {
    unlink: {
      title: t("dialogs.unlinkTitle"),
      body: t("dialogs.unlinkBody"),
      confirm: t("dialogs.unlinkConfirm"),
      run: () => unlink.mutate({ id }),
      m: unlink
    },
    archive: {
      title: t("dialogs.archiveTitle"),
      body: t("dialogs.archiveBody"),
      confirm: t("dialogs.archiveConfirm"),
      run: () => archive.mutate({ id }),
      m: archive
    },
    delete: {
      title: t("dialogs.deleteTitle"),
      body: t("dialogs.deleteBody"),
      confirm: t("dialogs.deleteConfirm"),
      run: () => remove.mutate({ id }),
      m: remove
    }
  };
  const active = pending ? dialogs[pending] : null;

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6">
      <BackLink to="/" label={t("detail.back")} />
      <PageHeader
        title={s.name}
        badge={<StatusBadge status={s.status} />}
        subtitle={
          <>
            <Icon name="location" className="size-4" />
            {[s.address ?? place, s.city].filter(Boolean).join(" · ")}
          </>
        }
        actions={
          canManage && !s.archived ? (
            <Button onClick={() => navigate(`/screens/${id}/edit`)}>{t("detail.edit")}</Button>
          ) : null
        }
      />
      {s.archived ? <Alert tone="info">{t("detail.archivedNotice")}</Alert> : null}

      <DevicePanel
        screenId={s.id}
        status={s.status}
        device={s.device}
        canManage={canManage}
        archived={s.archived}
        onUnlink={() => setPending("unlink")}
        onArchive={() => setPending("archive")}
        onDelete={() => setPending("delete")}
      />

      <SectionCard title={t("detail.info")}>
        <KeyValueRow label={t("form.placeType")} value={place ?? na} />
        <KeyValueRow
          label={t("form.environment")}
          value={s.environment ? t(`environment.${s.environment as Environment}`) : na}
        />
        <KeyValueRow
          label={t("detail.size")}
          value={
            s.widthCm && s.heightCm
              ? `${s.widthCm} x ${s.heightCm} cm${s.orientation ? ` · ${t(`orientation.${s.orientation as Orientation}`)}` : ""}`
              : na
          }
        />
        <KeyValueRow
          label={t("form.resolution")}
          value={s.resolution ? s.resolution.replace("x", " x ") : na}
        />
      </SectionCard>

      <SectionCard title={t("detail.availability")}>
        <DayPicker value={s.availableDays} />
        <KeyValueRow
          label={t("detail.schedule")}
          value={
            s.startTime && s.endTime
              ? `${formatTime12(s.startTime)} – ${formatTime12(s.endTime)}`
              : na
          }
        />
      </SectionCard>

      <SectionCard title={t("detail.price")}>
        <KeyValueRow
          label={t("detail.rate")}
          value={
            s.ratePerFiveSecondsCents !== null
              ? formatCents(s.ratePerFiveSecondsCents, language)
              : na
          }
        />
      </SectionCard>

      {!s.archived ? <ScreenAdsCard screenId={s.id} screenName={s.name} /> : null}

      <SectionCard title={t("detail.activity")} icon="barChart">
        {earnings.data?.available ? (
          <>
            {[
              { label: t("detail.today"), window: earnings.data.today },
              { label: t("detail.last7Days"), window: earnings.data.last7Days }
            ].map(({ label, window }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <p className="text-sm text-foreground">
                  {label} · {formatPlays(window.plays, t)} ·{" "}
                  {formatCents(window.earningsCents, language)}
                </p>
                {window.housePlays > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {window.housePlays === 1
                      ? t("detail.housePlays.one")
                      : t("detail.housePlays.other", { n: window.housePlays })}
                  </p>
                ) : null}
              </div>
            ))}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t("detail.noRate")}</p>
        )}
      </SectionCard>

      {active ? (
        <ConfirmDialog
          open
          title={active.title}
          body={active.body}
          confirmLabel={active.confirm}
          cancelLabel={t("dialogs.cancel")}
          destructive={pending !== "unlink"}
          loading={active.m.isPending}
          error={errorMessage(active.m.error, t)}
          onConfirm={active.run}
          onClose={() => setPending(null)}
        />
      ) : null}
    </div>
  );
}
