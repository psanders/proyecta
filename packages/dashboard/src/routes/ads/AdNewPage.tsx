/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { localDateString, type AssetView, type TimeZone } from "@proyecta/common";
import { AssetThumb, Pill } from "../../components/AdBadges.js";
import { BackLink, PageHeader } from "../../components/PageHeader.js";
import { ScreenPicker } from "../../components/ScreenPicker.js";
import { Alert } from "../../components/ui/Alert.js";
import { Button } from "../../components/ui/Button.js";
import { Card } from "../../components/ui/Card.js";
import { TextField } from "../../components/ui/Field.js";
import { Icon } from "../../components/ui/Icon.js";
import { cn } from "../../lib/cn.js";
import { errorMessage, fieldErrors } from "../../lib/errors.js";
import { formatCents, formatDateRange, formatSeconds } from "../../lib/format.js";
import type { MessageId } from "../../lib/i18n.js";
import { trpc } from "../../lib/trpc.js";
import { useI18n } from "../../lib/useI18n.js";

const STEPS = [
  "adNew.step.file",
  "adNew.step.screens",
  "adNew.step.dates",
  "adNew.step.review"
] as const;

/** Pencil advertiser-ad-new-*: file → screens → dates → review, then the ad is created. */
export function AdNewPage() {
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const utils = trpc.useUtils();
  const settings = trpc.workspaces.settings.useQuery(undefined, { staleTime: 60_000 });
  const assets = trpc.assets.list.useQuery();
  const catalog = trpc.ads.catalog.useQuery({});
  const today = localDateString(
    new Date(),
    (settings.data?.timezone as TimeZone | undefined) ?? "America/Santo_Domingo"
  );

  const [step, setStep] = useState(0);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [screenIds, setScreenIds] = useState<string[]>(() => {
    const preselected = params.get("screen");
    return preselected ? [preselected] : [];
  });
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const create = trpc.ads.create.useMutation({
    onSuccess: async ({ id }) => {
      await utils.ads.list.invalidate();
      navigate(`/ads/${id}`, { replace: true });
    }
  });

  const ready = (assets.data ?? []).filter((a) => a.status === "READY");
  const asset = ready.find((a) => a.id === assetId) ?? null;
  const chosen = (catalog.data ?? []).filter((s) => screenIds.includes(s.id));
  const errors = fieldErrors(create.error);
  const toggle = (id: string) =>
    setScreenIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const canContinue =
    (step === 0 && !!asset) ||
    (step === 1 && chosen.length > 0) ||
    (step === 2 && name.trim() !== "" && !!startDate && !!endDate && endDate >= startDate);

  const choose = (a: AssetView) => {
    setAssetId(a.id);
    if (!name) setName(a.name);
    // Drop preselected screens the new file can't play on.
    setScreenIds((ids) =>
      ids.filter((id) => {
        const screen = catalog.data?.find((s) => s.id === id);
        return !screen || screen.orientation === null || screen.orientation === a.orientation;
      })
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-6">
      <BackLink to="/ads" label={t("adDetail.back")} />
      <PageHeader title={t("adNew.title")} subtitle={t("adNew.subtitle")} />
      <ol className="flex items-center gap-2" aria-label={t("adNew.title")}>
        {STEPS.map((label, index) => (
          <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
            <span
              className="flex items-center gap-2"
              aria-current={index === step ? "step" : undefined}
            >
              <span
                className={cn(
                  "flex size-[26px] items-center justify-center rounded-full border font-mono text-xs",
                  index === step
                    ? "border-primary bg-primary text-primary-foreground"
                    : index < step
                      ? "border-border bg-secondary text-foreground"
                      : "border-border bg-card text-muted-foreground"
                )}
              >
                {index < step ? <Icon name="check" className="size-3.5" /> : index + 1}
              </span>
              <span
                className={cn(
                  "text-[13px]",
                  index === step ? "font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                {t(label)}
              </span>
            </span>
            {index < STEPS.length - 1 ? <span className="h-px flex-1 bg-border" /> : null}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-[15px] font-semibold">{t("adNew.fileTitle")}</h2>
          {assets.isSuccess && ready.length === 0 ? (
            <Alert tone="info">
              {t("adNew.noReadyFiles")}{" "}
              <Link to="/assets" className="font-medium underline">
                {t("adNew.goAssets")}
              </Link>
            </Alert>
          ) : null}
          <div className="grid grid-cols-3 gap-3" role="radiogroup">
            {ready.map((a) => (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={a.id === assetId}
                onClick={() => choose(a)}
                className={cn(
                  "flex flex-col border bg-card text-left",
                  a.id === assetId
                    ? "border-2 border-primary"
                    : "border-border hover:bg-secondary/40"
                )}
              >
                <AssetThumb
                  poster={a.renditions.poster}
                  kind={a.kind}
                  className="h-[120px] w-full"
                />
                <span className="flex flex-col gap-0.5 p-3">
                  <span className="truncate text-sm font-medium">{a.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {t(`assets.kind.${a.kind}` as MessageId)} · {formatSeconds(a.durationMs)} ·{" "}
                    {t(`orientation.${a.orientation}` as MessageId)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {step === 1 && asset ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-[15px] font-semibold">{t("adNew.screensTitle")}</h2>
          <ScreenPicker
            screens={catalog.data ?? []}
            orientation={asset.orientation}
            selected={screenIds}
            onToggle={toggle}
          />
        </section>
      ) : null}

      {step === 2 ? (
        <Card className="flex flex-col gap-4 p-6">
          <h2 className="text-[15px] font-semibold">{t("adNew.datesTitle")}</h2>
          <TextField
            label={t("adNew.name")}
            placeholder={t("adNew.namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
          />
          <div className="flex gap-4">
            <TextField
              label={t("adNew.start")}
              type="date"
              min={today}
              className="flex-1"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (endDate < e.target.value) setEndDate(e.target.value);
              }}
              error={errors.startDate}
            />
            <TextField
              label={t("adNew.end")}
              type="date"
              min={startDate}
              className="flex-1"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              error={errors.endDate}
            />
          </div>
        </Card>
      ) : null}

      {step === 3 && asset ? (
        <section className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4 p-6">
            <h2 className="text-[15px] font-semibold">{t("adNew.reviewTitle")}</h2>
            <SummaryLine label={t("adNew.name")} value={name} />
            <SummaryLine
              label={t("adNew.fieldFile")}
              value={`${asset.name} · ${t(`assets.kind.${asset.kind}` as MessageId)} · ${formatSeconds(asset.durationMs)} · ${t(`orientation.${asset.orientation}` as MessageId)}`}
            />
            <SummaryLine
              label={t("adNew.fieldDates")}
              value={formatDateRange(startDate, endDate, language)}
            />
            <div className="h-px bg-border" />
            <h3 className="text-[15px] font-semibold">
              {t("adDetail.screens", { n: chosen.length })}
            </h3>
            {chosen.map((screen) => (
              <div key={screen.id} className="flex items-center justify-between gap-4">
                <span className="flex flex-col">
                  <span className="text-sm font-medium">{screen.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {screen.own ? t("adNew.ownHint") : t("adNew.otherHint")}
                  </span>
                </span>
                {screen.own ? (
                  <Pill tone="orange">{t("explore.own")}</Pill>
                ) : (
                  <Pill tone="muted">
                    {t("adNew.ratePer5", {
                      rate: formatCents(screen.ratePerFiveSecondsCents, language)
                    })}
                  </Pill>
                )}
              </div>
            ))}
          </Card>
          <Alert tone="info">{t("adNew.reviewInfo")}</Alert>
          {errorMessage(create.error, t) ? (
            <Alert tone="error">{errorMessage(create.error, t)}</Alert>
          ) : null}
          {Object.keys(errors).length > 0 ? (
            <Alert tone="error">{Object.values(errors).join(" · ")}</Alert>
          ) : null}
        </section>
      ) : null}

      <div className="flex items-center justify-between">
        {step > 0 ? (
          <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
            {t("adNew.back")}
          </Button>
        ) : (
          <span />
        )}
        {step < 3 ? (
          <Button disabled={!canContinue} onClick={() => setStep((s) => s + 1)}>
            {step === 1
              ? chosen.length === 1
                ? t("adNew.nextScreens.one")
                : t("adNew.nextScreens.other", { n: chosen.length })
              : t("adNew.next")}
          </Button>
        ) : (
          <Button
            loading={create.isPending}
            onClick={() =>
              asset && create.mutate({ name, assetId: asset.id, startDate, endDate, screenIds })
            }
          >
            {t("adNew.submit")}
          </Button>
        )}
      </div>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}
