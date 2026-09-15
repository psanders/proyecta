/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { Link, useNavigate } from "react-router-dom";
import { AdStatusBadge, AssetThumb } from "../../components/AdBadges.js";
import { EmptyState, PageHeader, StatCard } from "../../components/PageHeader.js";
import { Alert } from "../../components/ui/Alert.js";
import { Button } from "../../components/ui/Button.js";
import { Card } from "../../components/ui/Card.js";
import { Icon } from "../../components/ui/Icon.js";
import { formatDateRange, formatReach, formatSeconds } from "../../lib/format.js";
import type { MessageId } from "../../lib/i18n.js";
import { trpc } from "../../lib/trpc.js";
import { useI18n } from "../../lib/useI18n.js";
import { useWorkspace } from "../../lib/useWorkspace.js";

/** Pencil advertiser-ads-v2: the business's ads with their derived status and reach. */
export function AdsPage() {
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const { canManage } = useWorkspace();
  const ads = trpc.ads.list.useQuery(undefined, { refetchInterval: 60_000 });
  const list = ads.data ?? [];
  const count = (status: string) => list.filter((ad) => ad.status === status).length;
  const create = canManage ? (
    <Button icon="add" onClick={() => navigate("/ads/new")}>
      {t("ads.create")}
    </Button>
  ) : null;

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-8">
      <PageHeader title={t("ads.title")} subtitle={t("ads.subtitle")} actions={create} />
      {ads.isSuccess && list.length === 0 ? (
        <EmptyState title={t("ads.emptyTitle")} body={t("ads.emptyBody")} action={create} />
      ) : (
        <>
          <div className="flex gap-4">
            <StatCard label={t("ads.onAir")} value={ads.isSuccess ? count("ON_AIR") : "–"} />
            <StatCard label={t("ads.scheduled")} value={ads.isSuccess ? count("SCHEDULED") : "–"} />
            <StatCard
              label={t("ads.pending")}
              value={ads.isSuccess ? count("PENDING_APPROVAL") : "–"}
            />
          </div>
          <section className="flex flex-col gap-3">
            <h2 className="font-mono text-base font-medium">{t("ads.yours")}</h2>
            {ads.isError ? <Alert tone="error">{t("ads.loadError")}</Alert> : null}
            {list.map((ad) => (
              <Link key={ad.id} to={`/ads/${ad.id}`} className="block">
                <Card className="flex items-center justify-between gap-4 p-4 hover:bg-secondary/40">
                  <div className="flex min-w-0 items-center gap-4">
                    <AssetThumb
                      poster={ad.asset.poster}
                      kind={ad.asset.kind}
                      className="h-11 w-[72px]"
                    />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium text-foreground">
                        {ad.name}
                      </span>
                      <span className="text-[13px] text-muted-foreground">
                        {t(`assets.kind.${ad.asset.kind}` as MessageId)} ·{" "}
                        {formatSeconds(ad.asset.durationMs)} ·{" "}
                        {formatDateRange(ad.startDate, ad.endDate, language)}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-5">
                    <span className="text-[13px] text-muted-foreground">
                      {formatReach(ad.screens, t)}
                    </span>
                    <AdStatusBadge status={ad.status} />
                    <Icon name="chevronRight" className="size-5 text-muted-foreground" />
                  </div>
                </Card>
              </Link>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
