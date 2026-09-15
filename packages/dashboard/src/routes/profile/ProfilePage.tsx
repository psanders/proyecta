/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useEffect, useState } from "react";
import { PageHeader } from "../../components/PageHeader.js";
import { Alert } from "../../components/ui/Alert.js";
import { Button } from "../../components/ui/Button.js";
import { SectionCard } from "../../components/ui/Card.js";
import { TextField } from "../../components/ui/Field.js";
import { errorMessage, fieldErrors } from "../../lib/errors.js";
import { trpc } from "../../lib/trpc.js";
import { useWorkspace } from "../../lib/useWorkspace.js";
import { strings } from "../../strings.js";

export function ProfilePage() {
  const utils = trpc.useUtils();
  const { active, canManage } = useWorkspace();
  const profile = trpc.profile.get.useQuery();
  const [name, setName] = useState("");
  const [business, setBusiness] = useState("");
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  useEffect(() => setName(profile.data?.name ?? ""), [profile.data?.name]);
  useEffect(() => setBusiness(active?.name ?? ""), [active?.name]);

  const updateName = trpc.profile.updateName.useMutation({
    onSuccess: () => void utils.profile.get.invalidate()
  });
  const rename = trpc.workspaces.rename.useMutation({
    onSuccess: () => void utils.workspaces.list.invalidate()
  });
  const changePassword = trpc.profile.changePassword.useMutation({
    onSuccess: () => setPasswords({ currentPassword: "", newPassword: "" })
  });

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6">
      <PageHeader title={strings.profile.title} subtitle={strings.profile.subtitle} />
      <SectionCard title={strings.profile.personal}>
        {updateName.isSuccess ? <Alert tone="success">{strings.profile.saved}</Alert> : null}
        <TextField
          label={strings.profile.name}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors(updateName.error).name}
        />
        <TextField
          label={strings.profile.email}
          value={profile.data?.email ?? ""}
          disabled
          readOnly
        />
        <div className="flex justify-end">
          <Button loading={updateName.isPending} onClick={() => updateName.mutate({ name })}>
            {strings.profile.saveName}
          </Button>
        </div>
      </SectionCard>
      {canManage ? (
        <SectionCard title={strings.profile.business}>
          {rename.isSuccess ? <Alert tone="success">{strings.profile.saved}</Alert> : null}
          <TextField
            label={strings.profile.businessName}
            value={business}
            onChange={(e) => setBusiness(e.target.value)}
            error={fieldErrors(rename.error).name}
          />
          <div className="flex justify-end">
            <Button loading={rename.isPending} onClick={() => rename.mutate({ name: business })}>
              {strings.profile.rename}
            </Button>
          </div>
        </SectionCard>
      ) : null}
      <SectionCard title={strings.profile.password}>
        {changePassword.isSuccess ? <Alert tone="success">{strings.profile.saved}</Alert> : null}
        {errorMessage(changePassword.error) ? (
          <Alert tone="error">{errorMessage(changePassword.error)}</Alert>
        ) : null}
        <TextField
          label={strings.profile.current}
          type="password"
          autoComplete="current-password"
          value={passwords.currentPassword}
          onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
          error={fieldErrors(changePassword.error).currentPassword}
        />
        <TextField
          label={strings.profile.newPassword}
          type="password"
          autoComplete="new-password"
          hint={strings.signUp.passwordHint}
          value={passwords.newPassword}
          onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
          error={fieldErrors(changePassword.error).newPassword}
        />
        <div className="flex justify-end">
          <Button
            loading={changePassword.isPending}
            onClick={() => changePassword.mutate(passwords)}
          >
            {strings.profile.changePassword}
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
