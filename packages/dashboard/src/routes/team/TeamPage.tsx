/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useState } from "react";
import { ROLE_LABELS } from "@proyecta/common";
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
import { strings } from "../../strings.js";

type Member = RouterOutputs["workspaces"]["members"][number];

/** Team page: members with role and status; admins invite, resend and remove. */
export function TeamPage() {
  const { canManage } = useWorkspace();
  const utils = trpc.useUtils();
  const profile = trpc.profile.get.useQuery();
  const members = trpc.workspaces.members.useQuery();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removing, setRemoving] = useState<Member | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const resend = trpc.workspaces.resendInvitation.useMutation({
    onSuccess: () => setNotice(strings.team.resent)
  });
  const remove = trpc.workspaces.removeMember.useMutation({
    onSuccess: () => {
      setRemoving(null);
      void utils.workspaces.members.invalidate();
    }
  });

  return (
    <div className="flex max-w-[1080px] flex-col gap-8">
      <PageHeader
        title={strings.team.title}
        subtitle={strings.team.subtitle}
        actions={
          canManage ? (
            <Button icon="add" onClick={() => setInviteOpen(true)}>
              {strings.team.invite}
            </Button>
          ) : null
        }
      />
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {errorMessage(resend.error) ? <Alert tone="error">{errorMessage(resend.error)}</Alert> : null}
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
          title={strings.team.removeTitle}
          body={`${removing.name} (${removing.email}). ${strings.team.removeBody}`}
          confirmLabel={strings.team.remove}
          cancelLabel={strings.dialogs.cancel}
          destructive
          loading={remove.isPending}
          error={errorMessage(remove.error)}
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
            {isYou ? <span className="text-muted-foreground">({strings.team.you})</span> : null}
          </span>
          <span className="truncate text-[13px] text-muted-foreground">{member.email}</span>
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <span className="text-sm text-muted-foreground">{ROLE_LABELS[member.role]}</span>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 font-mono text-xs",
            pending ? "bg-warning text-warning-foreground" : "bg-success text-success-foreground"
          )}
        >
          {pending ? strings.team.pending : strings.team.active}
        </span>
        {canManage && member.role !== "WORKSPACE_OWNER" ? (
          <div className="flex gap-1">
            {pending ? (
              <Button variant="ghost" icon="refresh" loading={resending} onClick={onResend}>
                {strings.team.resend}
              </Button>
            ) : null}
            <Button
              variant="ghost"
              icon="delete"
              onClick={onRemove}
              aria-label={`${strings.team.remove} ${member.name}`}
            >
              {strings.team.remove}
            </Button>
          </div>
        ) : null}
      </div>
    </li>
  );
}

function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
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
      title={strings.team.inviteTitle}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {strings.dialogs.cancel}
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
            {strings.team.sendInvite}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 pt-2 text-left">
        <p>{strings.team.inviteBody}</p>
        {errorMessage(invite.error) ? (
          <Alert tone="error">{errorMessage(invite.error)}</Alert>
        ) : null}
        <TextField
          label={strings.team.email}
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          error={errors.email}
        />
        <TextField
          label={strings.team.name}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          error={errors.name}
        />
        <SelectField
          label={strings.team.role}
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role })}
          options={[
            {
              value: "WORKSPACE_MEMBER",
              label: `${ROLE_LABELS.WORKSPACE_MEMBER} · ${strings.team.memberHint}`
            },
            {
              value: "WORKSPACE_ADMIN",
              label: `${ROLE_LABELS.WORKSPACE_ADMIN} · ${strings.team.adminHint}`
            }
          ]}
        />
      </div>
    </Dialog>
  );
}
