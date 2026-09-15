/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DR_CITIES, PLACE_TYPES, type CatalogScreenView, type PlaceType } from "@proyecta/common";
import { Pill } from "../../components/AdBadges.js";
import { PageHeader } from "../../components/PageHeader.js";
import { Alert } from "../../components/ui/Alert.js";
import { Button } from "../../components/ui/Button.js";
import { Card } from "../../components/ui/Card.js";
import { SelectField } from "../../components/ui/Field.js";
import { Icon } from "../../components/ui/Icon.js";
import { availabilitySummary, formatCents } from "../../lib/format.js";
import type { MessageId } from "../../lib/i18n.js";
import { trpc } from "../../lib/trpc.js";
import { useI18n } from "../../lib/useI18n.js";
import { useWorkspace } from "../../lib/useWorkspace.js";

/** Pencil advertiser-explore: the catalog of complete, active screens from every business. */
export function ExplorePage() {
  const { t } = useI18n();
  const [city, setCity] = useState("");
  const [placeType, setPlaceType] = useState<PlaceType | "">("");
  const catalog = trpc.ads.catalog.useQuery({
    ...(city ? { city } : {}),
    ...(placeType ? { placeType } : {})
  });
  const screens = catalog.data ?? [];

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-6">
      <PageHeader title={t("explore.title")} subtitle={t("explore.subtitle")} />
      <div className="flex items-end gap-4">
        <SelectField
          label={t("form.city")}
          className="w-[280px]"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={t("explore.allCities")}
          options={DR_CITIES.map((c) => ({ value: c, label: c }))}
        />
        <SelectField
          label={t("form.placeType")}
          className="w-[280px]"
          value={placeType}
          onChange={(e) => setPlaceType(e.target.value as PlaceType | "")}
          placeholder={t("explore.allTypes")}
          options={PLACE_TYPES.map((p) => ({ value: p, label: t(`placeType.${p}` as MessageId) }))}
        />
        {catalog.isSuccess ? (
          <span className="pb-2.5 text-[13px] text-muted-foreground">
            {screens.length === 1
              ? t("explore.count.one")
              : t("explore.count.other", { n: screens.length })}
          </span>
        ) : null}
      </div>
      {catalog.isError ? <Alert tone="error">{t("errors.generic")}</Alert> : null}
      {catalog.isLoading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Icon name="spinner" className="size-6 animate-spin" />
        </div>
      ) : null}
      {catalog.isSuccess && screens.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("explore.empty")}</p>
      ) : null}
      <div className="grid grid-cols-3 gap-4">
        {screens.map((screen) => (
          <CatalogCard key={screen.id} screen={screen} />
        ))}
      </div>
    </div>
  );
}

function CatalogCard({ screen }: { screen: CatalogScreenView }) {
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const { canManage } = useWorkspace();
  const place = [
    screen.city,
    screen.placeType ? t(`placeType.${screen.placeType}` as MessageId) : null
  ]
    .filter(Boolean)
    .join(" · ");
  const format = [
    screen.orientation ? t(`orientation.${screen.orientation}` as MessageId) : null,
    screen.resolution?.replace("x", "×")
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card className="flex flex-col gap-3.5 p-5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-mono text-[15px] font-medium text-foreground">{screen.name}</h3>
        {screen.own ? <Pill tone="orange">{t("explore.own")}</Pill> : null}
      </div>
      <p className="text-[13px] text-muted-foreground">{place}</p>
      <div className="flex flex-col gap-1.5 text-[13px] text-muted-foreground">
        {format ? <span>{format}</span> : null}
        <span>
          {availabilitySummary(screen.availableDays, screen.startTime, screen.endTime, t)}
        </span>
      </div>
      <div className="h-px bg-border" />
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="font-mono text-xl font-medium text-foreground">
            {formatCents(screen.ratePerFiveSecondsCents, language)}
          </span>
          <span className="text-xs text-muted-foreground">{t("explore.perFiveSeconds")}</span>
        </div>
        {canManage ? (
          <Button variant="outline" onClick={() => navigate(`/ads/new?screen=${screen.id}`)}>
            {t("explore.advertise")}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
