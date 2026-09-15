/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert } from "../../components/ui/Alert.js";
import { Button } from "../../components/ui/Button.js";
import { Icon } from "../../components/ui/Icon.js";
import { TextField } from "../../components/ui/Field.js";
import { errorMessage, fieldErrors } from "../../lib/errors.js";
import { session } from "../../lib/session.js";
import { trpc } from "../../lib/trpc.js";
import { strings } from "../../strings.js";

/**
 * Shown instead of the outlet when the signed-in person has no business (e.g. after deleting
 * their only one). Creates a business, refreshes the session so the token includes it, then sets
 * it active.
 */
export function CreateBusinessPage() {
  const utils = trpc.useUtils();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const create = trpc.workspaces.create.useMutation();
  const refresh = trpc.auth.refresh.useMutation();
  const [error, setError] = useState<unknown>(null);

  const submit = async () => {
    setError(null);
    try {
      const created = await create.mutateAsync({ name });
      const current = session.get();
      if (!current) return;
      const tokens = await refresh.mutateAsync({ refreshToken: current.refreshToken });
      session.set({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        workspace: null
      });
      void utils.invalidate();
      const list = await utils.workspaces.list.fetch();
      const match = list.find((w) => w.ref === created.ref);
      session.update({ workspace: match?.accessKeyId ?? null });
      navigate("/");
    } catch (err) {
      setError(err);
    }
  };

  const busy = create.isPending || refresh.isPending;

  return (
    <div className="mx-auto flex w-full max-w-[440px] flex-col items-center gap-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-secondary">
        <Icon name="storefront" className="size-6" />
      </div>
      <div className="flex flex-col gap-1.5">
        <h1 className="font-mono text-2xl font-medium text-foreground">
          {strings.createBusiness.title}
        </h1>
        <p className="text-sm text-muted-foreground">{strings.createBusiness.subtitle}</p>
      </div>
      <form
        className="flex w-full flex-col gap-4 text-left"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {errorMessage(error) ? <Alert tone="error">{errorMessage(error)}</Alert> : null}
        <TextField
          label={strings.signUp.business}
          placeholder={strings.signUp.businessPlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors(error).name}
        />
        <Button type="submit" loading={busy} className="w-full">
          {strings.createBusiness.submit}
        </Button>
      </form>
    </div>
  );
}
