/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ENVIRONMENT_LABELS,
  ORIENTATION_LABELS,
  PLACE_TYPE_LABELS,
  PRICE_MODEL_LABELS,
  type PlaceType
} from "@proyecta/common";
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
import { formatPesos } from "../../lib/format.js";
import { trpc } from "../../lib/trpc.js";
import { useWorkspace } from "../../lib/useWorkspace.js";
import { strings } from "../../strings.js";

type Pending = "unlink" | "archive" | "delete" | null;

/** Pencil frame screen-detail with the lifecycle dialogs. */
export function ScreenDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { canManage } = useWorkspace();
  const screen = trpc.screens.get.useQuery({ id }, { refetchInterval: 60_000 });
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
    return <Alert tone="error">{errorMessage(screen.error) ?? strings.errors.notFound}</Alert>;
  const s = screen.data;
  const na = strings.detail.notSet;
  const place = s.placeType ? PLACE_TYPE_LABELS[s.placeType as PlaceType] : null;

  const dialogs = {
    unlink: {
      title: strings.dialogs.unlinkTitle,
      body: strings.dialogs.unlinkBody,
      confirm: strings.dialogs.unlinkConfirm,
      run: () => unlink.mutate({ id }),
      m: unlink
    },
    archive: {
      title: strings.dialogs.archiveTitle,
      body: strings.dialogs.archiveBody,
      confirm: strings.dialogs.archiveConfirm,
      run: () => archive.mutate({ id }),
      m: archive
    },
    delete: {
      title: strings.dialogs.deleteTitle,
      body: strings.dialogs.deleteBody,
      confirm: strings.dialogs.deleteConfirm,
      run: () => remove.mutate({ id }),
      m: remove
    }
  };
  const active = pending ? dialogs[pending] : null;

  return (
    <div className="flex max-w-[760px] flex-col gap-6">
      <BackLink to="/" label={strings.detail.back} />
      <PageHeader
        title={s.name}
        badge={<StatusBadge status={s.status} />}
        subtitle={[place, s.city].filter(Boolean).join(" · ")}
        actions={
          canManage && !s.archived ? (
            <Button onClick={() => navigate(`/pantallas/${id}/editar`)}>
              {strings.detail.edit}
            </Button>
          ) : null
        }
      />
      {s.archived ? <Alert tone="info">{strings.detail.archivedNotice}</Alert> : null}

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

      <SectionCard title={strings.detail.info}>
        <KeyValueRow label={strings.form.placeType} value={place ?? na} />
        <KeyValueRow
          label={strings.form.environment}
          value={
            s.environment
              ? ENVIRONMENT_LABELS[s.environment as keyof typeof ENVIRONMENT_LABELS]
              : na
          }
        />
        <KeyValueRow label={strings.form.address} value={s.address ?? na} />
        <KeyValueRow
          label="Tamaño"
          value={
            s.widthCm && s.heightCm
              ? `${s.widthCm} × ${s.heightCm} cm${s.orientation ? ` · ${ORIENTATION_LABELS[s.orientation as keyof typeof ORIENTATION_LABELS]}` : ""}`
              : na
          }
        />
        <KeyValueRow
          label={strings.form.resolution}
          value={s.resolution ? s.resolution.replace("x", " × ") : na}
        />
      </SectionCard>

      <SectionCard title={strings.detail.availability}>
        <DayPicker value={s.availableDays} />
        <KeyValueRow
          label={strings.detail.schedule}
          value={s.startTime && s.endTime ? `${s.startTime} – ${s.endTime}` : na}
        />
      </SectionCard>

      <SectionCard title={strings.detail.price}>
        <KeyValueRow
          label={strings.detail.reference}
          value={s.priceReference !== null ? formatPesos(s.priceReference) : na}
        />
        <KeyValueRow
          label={strings.detail.model}
          value={
            s.priceModel ? PRICE_MODEL_LABELS[s.priceModel as keyof typeof PRICE_MODEL_LABELS] : na
          }
        />
      </SectionCard>

      <SectionCard title={strings.detail.activity}>
        <p className="text-sm text-muted-foreground">{strings.detail.activityBody}</p>
      </SectionCard>

      {active ? (
        <ConfirmDialog
          open
          title={active.title}
          body={active.body}
          confirmLabel={active.confirm}
          cancelLabel={strings.dialogs.cancel}
          destructive={pending !== "unlink"}
          loading={active.m.isPending}
          error={errorMessage(active.m.error)}
          onConfirm={active.run}
          onClose={() => setPending(null)}
        />
      ) : null}
    </div>
  );
}
