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
import { strings } from "../../strings.js";

export function ScreensPage() {
  const [archived, setArchived] = useState(false);
  const navigate = useNavigate();
  const { canManage } = useWorkspace();
  const list = trpc.screens.list.useQuery({ archived });
  const totals = list.data?.totals;
  const add = canManage ? (
    <Button icon="add" onClick={() => navigate("/pantallas/nueva")}>
      {strings.screens.add}
    </Button>
  ) : null;

  if (list.isSuccess && !archived && totals?.all === 0) {
    return (
      <div className="flex max-w-[1080px] flex-col gap-8">
        <PageHeader
          title={strings.screens.title}
          subtitle={strings.screens.subtitle}
          actions={add}
        />
        <EmptyState
          title={strings.screens.emptyTitle}
          body={strings.screens.emptyBody}
          action={
            canManage ? (
              <Button icon="add" onClick={() => navigate("/bienvenida")}>
                {strings.screens.add}
              </Button>
            ) : null
          }
        />
      </div>
    );
  }

  return (
    <div className="flex max-w-[1080px] flex-col gap-8">
      <PageHeader title={strings.screens.title} subtitle={strings.screens.subtitle} actions={add} />
      <div className="flex gap-4">
        <StatCard label={strings.screens.total} value={totals?.all ?? "–"} />
        <StatCard label={strings.screens.online} value={totals?.online ?? "–"} />
        <StatCard label={strings.screens.incomplete} value={totals?.incomplete ?? "–"} />
      </div>
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium">{strings.screens.yours}</h2>
          <div className="flex rounded-full bg-secondary p-1 text-sm" role="tablist">
            {[
              { value: false, label: strings.screens.active },
              { value: true, label: strings.screens.archived }
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
        {list.isError ? <Alert tone="error">{strings.screens.loadError}</Alert> : null}
        {list.isLoading ? (
          <Icon name="spinner" className="size-6 animate-spin text-muted-foreground" />
        ) : list.data?.screens.length === 0 ? (
          <p className="text-sm text-muted-foreground">{strings.screens.noArchived}</p>
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
