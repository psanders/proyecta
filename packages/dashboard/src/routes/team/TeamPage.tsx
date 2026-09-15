/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useState } from "react";
import { PageHeader } from "../../components/PageHeader.js";
import { Alert } from "../../components/ui/Alert.js";
import { Button } from "../../components/ui/Button.js";
import { Card } from "../../components/ui/Card.js";
import { ConfirmDialog, Dialog } from "../../components/ui/Dialog.js";
import { SelectField, TextField } from "../../components/ui/Field.js";
import { Icon } from "../../components/ui/Icon.js";
import { cn } from "../../lib/cn.js";
import { errorMessage, fieldErrors } from "../../lib/errors.js";
import { trpc, type RouterOutputs } from "../../lib/trpc.js";
import { useWorkspace } from "../../lib/useWorkspace.js";
import { useI18n } from "../../lib/useI18n.js";

type Member = RouterOutputs["workspaces"]["members"][number];

/** Team page: members with role and status; admins invite, resend and remove. */
export function TeamPage() {
  const { t } = useI18n();
  const { canManage } = useWorkspace();
  const utils = trpc.useUtils();
  const profile = trpc.profile.get.useQuery();
  const members = trpc.workspaces.members.useQuery();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removing, setRemoving] = useState<Member | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const resend = trpc.workspaces.resendInvitation.useMutation({
    onSuccess: () => setNotice(t("team.resent"))
  });
  const remove = trpc.workspaces.removeMember.useMutation({
    onSuccess: () => {
      setRemoving(null);
      void utils.workspaces.members.invalidate();
    }
  });

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-8">
      <PageHeader
        title={t("team.title")}
        subtitle={t("team.subtitle")}
        actions={
          canManage ? (
            <Button icon="add" onClick={() => setInviteOpen(true)}>
              {t("team.invite")}
            </Button>
          ) : null
        }
      />
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {errorMessage(resend.error, t) ? (
        <Alert tone="error">{errorMessage(resend.error, t)}</Alert>
      ) : null}
      <Card>
        {members.isLoading ? (
          <div className="p-6">
            <Icon name="spinner" className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {members.data?.map((member) => (
              <MemberRow
                key={member.userRef}
                member={member}
                isYou={member.email === profile.data?.email}
                canManage={canManage}
                resending={resend.isPending && resend.variables?.userRef === member.userRef}
                onResend={() => resend.mutate({ userRef: member.userRef })}
                onRemove={() => setRemoving(member)}
              />
            ))}
          </ul>
        )}
      </Card>
      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
      {removing ? (
        <ConfirmDialog
          open
          title={t("team.removeTitle")}
          body={`${removing.name} (${removing.email}). ${t("team.removeBody")}`}
          confirmLabel={t("team.remove")}
          cancelLabel={t("dialogs.cancel")}
          destructive
          loading={remove.isPending}
          error={errorMessage(remove.error, t)}
          onConfirm={() => remove.mutate({ userRef: removing.userRef })}
          onClose={() => setRemoving(null)}
        />
      ) : null}
    </div>
  );
}

/** Pencil Dashboard/Member Row: initials, name + email, role, status, actions. */
function MemberRow({
  member,
  isYou,
  canManage,
  resending,
  onResend,
  onRemove
}: {
  member: Member;
  isYou: boolean;
  canManage: boolean;
  resending: boolean;
  onResend: () => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  const initials = member.name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const pending = member.status === "PENDING";
  return (
    <li className="flex items-center justify-between gap-4 px-6 py-4" data-testid="member-row">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-sm">
          {initials}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">
            {member.name}{" "}
            {isYou ? <span className="text-muted-foreground">({t("team.you")})</span> : null}
          </span>
          <span className="truncate text-[13px] text-muted-foreground">{member.email}</span>
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <span className="text-sm text-muted-foreground">{t(`role.${member.role}`)}</span>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 font-mono text-xs",
            pending ? "bg-warning text-warning-foreground" : "bg-success text-success-foreground"
          )}
        >
          {pending ? t("team.pending") : t("team.active")}
        </span>
        {canManage && member.role !== "WORKSPACE_OWNER" ? (
          <div className="flex gap-1">
            {pending ? (
              <Button variant="ghost" icon="refresh" loading={resending} onClick={onResend}>
                {t("team.resend")}
              </Button>
            ) : null}
            <Button
              variant="ghost"
              icon="delete"
              onClick={onRemove}
              aria-label={`${t("team.remove")} ${member.name}`}
            >
              {t("team.remove")}
            </Button>
          </div>
        ) : null}
      </div>
    </li>
  );
}

function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    email: "",
    name: "",
    role: "WORKSPACE_MEMBER" as "WORKSPACE_MEMBER" | "WORKSPACE_ADMIN"
  });
  const invite = trpc.workspaces.invite.useMutation({
    onSuccess: () => {
      void utils.workspaces.members.invalidate();
      setForm({ email: "", name: "", role: "WORKSPACE_MEMBER" });
      invite.reset();
      onClose();
    }
  });
  const errors = fieldErrors(invite.error);
  return (
    <Dialog
      open={open}
      title={t("team.inviteTitle")}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t("dialogs.cancel")}
          </Button>
          <Button
            icon="mail"
            loading={invite.isPending}
            onClick={() =>
              invite.mutate({
                email: form.email,
                role: form.role,
                name: form.name.trim() || undefined
              })
            }
          >
            {t("team.sendInvite")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 pt-2 text-left">
        <p>{t("team.inviteBody")}</p>
        {errorMessage(invite.error, t) ? (
          <Alert tone="error">{errorMessage(invite.error, t)}</Alert>
        ) : null}
        <TextField
          label={t("team.email")}
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          error={errors.email}
        />
        <TextField
          label={t("team.name")}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          error={errors.name}
        />
        <SelectField
          label={t("team.role")}
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role })}
          options={[
            {
              value: "WORKSPACE_MEMBER",
              label: `${t("role.WORKSPACE_MEMBER")} · ${t("team.memberHint")}`
            },
            {
              value: "WORKSPACE_ADMIN",
              label: `${t("role.WORKSPACE_ADMIN")} · ${t("team.adminHint")}`
            }
          ]}
        />
      </div>
    </Dialog>
  );
}
