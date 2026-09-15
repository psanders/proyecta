/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DEFAULT_TIMEZONE,
  DELETE_WORKSPACE_CONFIRMATION,
  TIMEZONES,
  timeZoneLabel,
  type TimeZone
} from "@proyecta/common";
import { PageHeader } from "../../components/PageHeader.js";
import { Alert } from "../../components/ui/Alert.js";
import { Button } from "../../components/ui/Button.js";
import { SectionCard } from "../../components/ui/Card.js";
import { Dialog } from "../../components/ui/Dialog.js";
import { SelectField, TextField } from "../../components/ui/Field.js";
import { errorMessage, fieldErrors } from "../../lib/errors.js";
import { session } from "../../lib/session.js";
import { trpc } from "../../lib/trpc.js";
import { strings } from "../../strings.js";

const TIMEZONE_OPTIONS = TIMEZONES.map((tz) => ({ value: tz, label: timeZoneLabel(tz) }));

/** Pencil workspace-settings: Preferencias card for every member, owner-only Eliminar negocio card. */
export function SettingsPage() {
  const utils = trpc.useUtils();
  const settings = trpc.workspaces.settings.useQuery();
  const [form, setForm] = useState<{ name: string; timezone: TimeZone }>({
    name: "",
    timezone: DEFAULT_TIMEZONE
  });
  useEffect(() => {
    if (settings.data) {
      setForm({ name: settings.data.name, timezone: settings.data.timezone as TimeZone });
    }
  }, [settings.data]);

  const update = trpc.workspaces.updateSettings.useMutation({
    onSuccess: () => {
      void utils.workspaces.list.invalidate();
      void utils.workspaces.settings.invalidate();
    }
  });

  const canEdit = settings.data?.canEdit ?? false;
  const errors = fieldErrors(update.error);

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6">
      <PageHeader title={strings.settings.title} subtitle={strings.settings.subtitle} />
      <SectionCard title={strings.settings.preferences} hint={strings.settings.preferencesHint}>
        {update.isSuccess ? <Alert tone="success">{strings.settings.saved}</Alert> : null}
        {errorMessage(update.error) ? (
          <Alert tone="error">{errorMessage(update.error)}</Alert>
        ) : null}
        {!canEdit ? <Alert tone="info">{strings.settings.readOnly}</Alert> : null}
        <TextField
          label={strings.settings.name}
          value={form.name}
          disabled={!canEdit}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          error={errors.name}
        />
        <div className="flex gap-4">
          <SelectField
            label={strings.settings.currency}
            className="flex-1 opacity-60"
            disabled
            value="USD"
            options={[{ value: "USD", label: strings.settings.currencyValue }]}
          />
          <SelectField
            label={strings.settings.timezone}
            className="flex-1"
            disabled={!canEdit}
            value={form.timezone}
            onChange={(e) => setForm({ ...form, timezone: e.target.value as TimeZone })}
            options={TIMEZONE_OPTIONS}
            error={errors.timezone}
          />
        </div>
        <p className="text-xs text-muted-foreground">{strings.settings.currencyHint}</p>
        {canEdit ? (
          <div className="flex justify-end">
            <Button loading={update.isPending} onClick={() => update.mutate(form)}>
              {strings.settings.save}
            </Button>
          </div>
        ) : null}
      </SectionCard>
      {settings.data?.isOwner ? <DangerCard name={settings.data.name} /> : null}
    </div>
  );
}

/** Pencil "Eliminar Card": red 30%-border danger card with the type-to-confirm dialog. */
function DangerCard({ name }: { name: string }) {
  const utils = trpc.useUtils();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const remove = trpc.workspaces.delete.useMutation({
    onSuccess: () => {
      session.update({ workspace: null });
      void utils.workspaces.list.invalidate();
      navigate("/");
    }
  });

  const close = () => {
    if (remove.isPending) return;
    setOpen(false);
    setConfirmation("");
    remove.reset();
  };

  return (
    <>
      <div className="flex items-center justify-between gap-6 border border-destructive/30 bg-card p-6">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[15px] font-semibold text-foreground">
            {strings.settings.deleteTitle}
          </h2>
          <p className="text-[13px] text-muted-foreground">{strings.settings.deleteBody}</p>
        </div>
        <Button
          variant="outline"
          className="shrink-0 border-destructive/30 text-destructive"
          onClick={() => setOpen(true)}
        >
          {strings.settings.deleteTitle}
        </Button>
      </div>
      <Dialog
        open={open}
        title={strings.settings.deleteDialogTitle(name)}
        onClose={close}
        footer={
          <>
            <Button variant="outline" onClick={close}>
              {strings.dialogs.cancel}
            </Button>
            <Button
              variant="destructive"
              disabled={confirmation !== DELETE_WORKSPACE_CONFIRMATION}
              loading={remove.isPending}
              onClick={() => remove.mutate({ confirmation })}
            >
              {strings.settings.deleteTitle}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 text-left">
          <p>{strings.settings.deleteDialogBody}</p>
          {errorMessage(remove.error) ? (
            <Alert tone="error">{errorMessage(remove.error)}</Alert>
          ) : null}
          <TextField
            label={strings.settings.deleteConfirmLabel}
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </div>
      </Dialog>
    </>
  );
}
