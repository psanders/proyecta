/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState, PageHeader, StatCard } from "../../components/PageHeader.js";
import { ScreenRow } from "../../components/ScreenRow.js";
import { Alert } from "../../components/ui/Alert.js";
import { Button } from "../../components/ui/Button.js";
import { Icon } from "../../components/ui/Icon.js";
import { cn } from "../../lib/cn.js";
import { trpc } from "../../lib/trpc.js";
import { useWorkspace } from "../../lib/useWorkspace.js";
import { useI18n } from "../../lib/useI18n.js";

export function ScreensPage() {
  const { t } = useI18n();
  const [archived, setArchived] = useState(false);
  const navigate = useNavigate();
  const { canManage } = useWorkspace();
  const list = trpc.screens.list.useQuery({ archived });
  const totals = list.data?.totals;
  const add = canManage ? (
    <Button icon="add" onClick={() => navigate("/screens/new")}>
      {t("screens.add")}
    </Button>
  ) : null;

  if (list.isSuccess && !archived && totals?.all === 0) {
    return (
      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-8">
        <PageHeader title={t("screens.title")} subtitle={t("screens.subtitle")} actions={add} />
        <EmptyState
          title={t("screens.emptyTitle")}
          body={t("screens.emptyBody")}
          action={
            canManage ? (
              <Button onClick={() => navigate("/onboarding")}>{t("screens.add")}</Button>
            ) : null
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-8">
      <PageHeader title={t("screens.title")} subtitle={t("screens.subtitle")} actions={add} />
      <div className="flex gap-4">
        <StatCard label={t("screens.total")} value={totals?.all ?? "–"} />
        <StatCard label={t("screens.online")} value={totals?.online ?? "–"} />
        <StatCard label={t("screens.incomplete")} value={totals?.incomplete ?? "–"} />
      </div>
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-base font-medium">{t("screens.yours")}</h2>
          <div className="flex gap-0.5 rounded-full bg-secondary p-1 text-[13px]" role="tablist">
            {[
              { value: false, label: t("screens.active") },
              { value: true, label: t("screens.archived") }
            ].map((tab) => (
              <button
                key={tab.label}
                role="tab"
                aria-selected={archived === tab.value}
                onClick={() => setArchived(tab.value)}
                className={cn(
                  "rounded-full px-4 py-1.5",
                  archived === tab.value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        {list.isError ? <Alert tone="error">{t("screens.loadError")}</Alert> : null}
        {list.isLoading ? (
          <Icon name="spinner" className="size-6 animate-spin text-muted-foreground" />
        ) : list.data?.screens.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("screens.noArchived")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {list.data?.screens.map((screen) => (
              <ScreenRow key={screen.id} screen={screen} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
