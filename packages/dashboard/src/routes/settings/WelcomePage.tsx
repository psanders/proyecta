/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { DashboardView } from "@proyecta/common";
import { ViewChoice } from "../../components/ViewChoice.js";
import { Alert } from "../../components/ui/Alert.js";
import { Button } from "../../components/ui/Button.js";
import { Icon } from "../../components/ui/Icon.js";
import { errorMessage } from "../../lib/errors.js";
import { trpc } from "../../lib/trpc.js";
import { useI18n } from "../../lib/useI18n.js";

/**
 * Pencil onboarding-view-choice: the first step after sign up asks what the business wants to do,
 * saves it as the dashboard view and continues to pairing (screens, both) or Buscar pantallas.
 */
export function WelcomePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [view, setView] = useState<DashboardView>("SCREEN_OWNER");
  const save = trpc.workspaces.setDashboardView.useMutation({
    onSuccess: async () => {
      await utils.workspaces.settings.invalidate();
      navigate(view === "ADVERTISER" ? "/explore" : "/onboarding", { replace: true });
    }
  });

  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="flex items-center justify-between px-10 py-6">
        <div className="flex items-center gap-2">
          <Icon name="tv" className="size-6 text-primary" />
          <span className="font-mono text-base font-bold text-foreground">{t("brand")}</span>
        </div>
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          {t("onboarding.exit")}
        </Link>
      </header>
      <div className="mx-auto flex w-[640px] max-w-full flex-col items-center gap-10 px-6 pt-10 pb-16 text-center">
        <span className="rounded-full bg-secondary px-3 py-2 font-mono text-sm leading-none text-foreground">
          {t("onboarding.welcome")}
        </span>
        <div className="flex flex-col gap-4">
          <h1 className="font-mono text-4xl leading-[1.2] font-medium">{t("view.question")}</h1>
          <p className="text-base leading-normal text-muted-foreground">{t("view.questionHint")}</p>
        </div>
        <div className="w-full text-left">
          <ViewChoice value={view} onChange={setView} />
        </div>
        {errorMessage(save.error, t) ? (
          <Alert tone="error" className="w-full text-left">
            {errorMessage(save.error, t)}
          </Alert>
        ) : null}
        <div className="flex w-full justify-end">
          <Button loading={save.isPending} onClick={() => save.mutate({ dashboardView: view })}>
            {t("onboarding.continue")}
          </Button>
        </div>
      </div>
    </div>
  );
}
