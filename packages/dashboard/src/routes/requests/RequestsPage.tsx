/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { localDateString, type RequestTab } from "@proyecta/common";
import { AssetThumb, Pill } from "../../components/AdBadges.js";
import { PageHeader } from "../../components/PageHeader.js";
import { Alert } from "../../components/ui/Alert.js";
import { Card } from "../../components/ui/Card.js";
import { Icon } from "../../components/ui/Icon.js";
import { cn } from "../../lib/cn.js";
import { formatDate, formatDateRange, formatSeconds } from "../../lib/format.js";
import type { MessageId } from "../../lib/i18n.js";
import { trpc } from "../../lib/trpc.js";
import { useI18n } from "../../lib/useI18n.js";

/** Pencil owner-requests: other businesses' ads on the owner's screens, pending and reviewed. */
export function RequestsPage() {
  const { t, language } = useI18n();
  const [tab, setTab] = useState<RequestTab>("PENDING");
  const requests = trpc.adReview.list.useQuery({ tab }, { refetchInterval: 30_000 });
  const today = localDateString(new Date(), "America/Santo_Domingo");
  const list = requests.data ?? [];

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-6">
      <PageHeader title={t("requests.title")} subtitle={t("requests.subtitle")} />
      <div className="flex w-fit gap-0.5 rounded-full bg-secondary p-1 text-[13px]" role="tablist">
        {(["PENDING", "REVIEWED"] as const).map((value) => (
          <button
            key={value}
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              "rounded-full px-4 py-1.5",
              tab === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            {t(value === "PENDING" ? "requests.pending" : "requests.reviewed")}
          </button>
        ))}
      </div>
      {requests.isError ? <Alert tone="error">{t("requests.loadError")}</Alert> : null}
      {requests.isLoading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Icon name="spinner" className="size-6 animate-spin" />
        </div>
      ) : null}
      {requests.isSuccess && list.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          {t(tab === "PENDING" ? "requests.emptyPending" : "requests.emptyReviewed")}
        </p>
      ) : null}
      <div className="flex flex-col gap-3">
        {list.map((request) => {
          const names = request.screens.map((s) => s.name).join(", ");
          return (
            <Link key={request.adId} to={`/requests/${request.adId}`} className="block">
              <Card className="flex items-center justify-between gap-4 p-4 hover:bg-secondary/40">
                <div className="flex min-w-0 items-center gap-4">
                  <AssetThumb
                    poster={request.asset.poster}
                    kind={request.asset.kind}
                    className="h-[54px] w-[96px]"
                  />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm">
                      <span className="font-semibold text-foreground">{request.adName}</span>
                      <span className="text-muted-foreground"> · {request.advertiserName}</span>
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      {t(`assets.kind.${request.asset.kind}` as MessageId)} ·{" "}
                      {formatSeconds(request.asset.durationMs)} ·{" "}
                      {formatDateRange(request.startDate, request.endDate, language)}
                    </span>
                    <span className="truncate text-[13px] text-muted-foreground">
                      {request.screens.length === 1
                        ? t("requests.screens.one", { names })
                        : t("requests.screens.other", { n: request.screens.length, names })}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  {request.pending ? (
                    <span className="text-[13px] text-muted-foreground">
                      {request.startDate > today
                        ? t("requests.startsOn", { date: formatDate(request.startDate, language) })
                        : t("requests.started")}
                    </span>
                  ) : null}
                  <Pill tone={request.pending ? "warning" : "muted"}>
                    {t(request.pending ? "requests.statusPending" : "requests.statusReviewed")}
                  </Pill>
                  <Icon name="chevronRight" className="size-5 text-muted-foreground" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
