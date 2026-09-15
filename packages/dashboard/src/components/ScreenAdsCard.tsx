/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import type { ScreenAdView } from "@proyecta/common";
import { formatDateRange } from "../lib/format.js";
import { trpc } from "../lib/trpc.js";
import { useI18n } from "../lib/useI18n.js";
import { useWorkspace } from "../lib/useWorkspace.js";
import { StopDialog } from "../routes/requests/RequestReviewPage.js";
import { AdScreenStatusBadge } from "./AdBadges.js";
import { Button } from "./ui/Button.js";
import { SectionCard } from "./ui/Card.js";

/** Screen detail "Anuncios en esta pantalla": other businesses' pending and approved ads. */
export function ScreenAdsCard({ screenId, screenName }: { screenId: string; screenName: string }) {
  const { t, language } = useI18n();
  const { canManage } = useWorkspace();
  const utils = trpc.useUtils();
  const ads = trpc.adReview.screenAds.useQuery({ screenId }, { refetchInterval: 60_000 });
  const [stopping, setStopping] = useState<ScreenAdView | null>(null);

  return (
    <SectionCard title={t("screenAds.title")} icon="campaign" hint={t("screenAds.hint")}>
      {ads.isSuccess && ads.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("screenAds.empty")}</p>
      ) : null}
      {(ads.data ?? []).map((ad) => (
        <div key={ad.adId} data-testid="screen-ad" className="flex items-center gap-4">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium text-foreground">
              {ad.adName} <span className="text-muted-foreground">· {ad.advertiserName}</span>
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDateRange(ad.startDate, ad.endDate, language)}
            </span>
          </div>
          <AdScreenStatusBadge status={ad.status} />
          {ad.status === "PENDING_APPROVAL" ? (
            <Link to={`/requests/${ad.adId}`} className="text-[13px] font-medium text-primary">
              {t("requests.review")}
            </Link>
          ) : canManage ? (
            <Button
              variant="outline"
              className="border-destructive/30 text-destructive"
              onClick={() => setStopping(ad)}
            >
              {t("review.stop")}
            </Button>
          ) : null}
        </div>
      ))}
      {stopping ? (
        <StopDialog
          ad={stopping}
          screen={{ screenId, name: screenName }}
          onDone={() => {
            void utils.adReview.screenAds.invalidate({ screenId });
            void utils.adReview.list.invalidate();
          }}
          onClose={() => setStopping(null)}
        />
      ) : null}
    </SectionCard>
  );
}
