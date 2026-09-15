/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  REVIEW_REASONS,
  type RequestScreenView,
  type ReviewReason,
  type ReviewRequestView
} from "@proyecta/common";
import { AdScreenStatusBadge, Pill } from "../../components/AdBadges.js";
import { BackLink, PageHeader } from "../../components/PageHeader.js";
import { Alert } from "../../components/ui/Alert.js";
import { Button } from "../../components/ui/Button.js";
import { Card } from "../../components/ui/Card.js";
import { Dialog } from "../../components/ui/Dialog.js";
import { Icon } from "../../components/ui/Icon.js";
import { errorMessage, fieldErrors } from "../../lib/errors.js";
import { formatCents, formatDateRange, formatSeconds } from "../../lib/format.js";
import type { MessageId } from "../../lib/i18n.js";
import { trpc } from "../../lib/trpc.js";
import { useI18n } from "../../lib/useI18n.js";
import { useWorkspace } from "../../lib/useWorkspace.js";

/** Pencil owner-request-review: preview, facts, choose screens and approve, reject or stop. */
export function RequestReviewPage() {
  const { adId = "" } = useParams();
  const { t, language } = useI18n();
  const { canManage } = useWorkspace();
  const utils = trpc.useUtils();
  const request = trpc.adReview.get.useQuery({ adId });
  const [selected, setSelected] = useState<string[]>([]);
  const [rejecting, setRejecting] = useState(false);
  const [stopping, setStopping] = useState<RequestScreenView | null>(null);

  // Every pending screen starts checked; recomputed whenever the pending set changes.
  const pendingKey = (request.data?.screens ?? [])
    .filter((s) => s.pending)
    .map((s) => s.screenId)
    .join(",");
  useEffect(() => setSelected(pendingKey ? pendingKey.split(",") : []), [pendingKey]);

  const refresh = () => {
    void utils.adReview.get.invalidate({ adId });
    void utils.adReview.list.invalidate();
    void utils.adReview.pendingCount.invalidate();
    void utils.adReview.screenAds.invalidate();
  };
  const approve = trpc.adReview.approve.useMutation({ onSuccess: refresh });

  if (request.isError) {
    return (
      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-6">
        <BackLink to="/requests" label={t("review.back")} />
        <Alert tone="error">{errorMessage(request.error, t)}</Alert>
      </div>
    );
  }
  if (!request.data) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Icon name="spinner" className="size-6 animate-spin" />
      </div>
    );
  }

  const data = request.data;
  const decidable = canManage && data.pending;

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-6">
      <BackLink to="/requests" label={t("review.back")} />
      <PageHeader
        title={data.adName}
        badge={
          <Pill tone={data.pending ? "warning" : "muted"}>
            {t(data.pending ? "requests.statusPending" : "requests.statusReviewed")}
          </Pill>
        }
        subtitle={
          data.screens.length === 1
            ? t("review.subtitle.one", { advertiser: data.advertiserName })
            : t("review.subtitle.other", {
                advertiser: data.advertiserName,
                n: data.screens.length
              })
        }
      />
      {!data.open ? <Alert tone="info">{t("review.closed")}</Alert> : null}

      <div className="flex items-start gap-6">
        <div className="flex w-[520px] shrink-0 flex-col gap-4">
          <Preview request={data} />
          <Card className="flex flex-col gap-2.5 p-5 text-[13px]">
            <Fact label={t("review.advertiser")} value={data.advertiserName} />
            <Fact
              label={t("review.format")}
              value={`${t(`assets.kind.${data.asset.kind}` as MessageId)} · ${t(`orientation.${data.asset.orientation}` as MessageId)} · ${data.asset.width}×${data.asset.height}`}
            />
            <Fact label={t("review.duration")} value={formatSeconds(data.asset.durationMs)} />
            <Fact
              label={t("review.dates")}
              value={formatDateRange(data.startDate, data.endDate, language)}
            />
          </Card>
        </div>

        <Card className="flex flex-1 flex-col">
          <div className="flex flex-col gap-0.5 px-5 py-4">
            <h2 className="text-[15px] font-semibold">
              {t(decidable ? "review.screensTitle" : "review.decidedTitle")}
            </h2>
            {decidable ? (
              <p className="text-[13px] text-muted-foreground">{t("review.screensHint")}</p>
            ) : null}
          </div>
          {data.screens.map((screen) => (
            <div
              key={screen.screenId}
              data-testid="request-screen"
              className="flex items-center gap-3.5 border-t border-border px-5 py-3.5"
            >
              {decidable && screen.pending ? (
                <input
                  type="checkbox"
                  aria-label={screen.name}
                  className="size-4 accent-[var(--color-primary)]"
                  checked={selected.includes(screen.screenId)}
                  onChange={() =>
                    setSelected((ids) =>
                      ids.includes(screen.screenId)
                        ? ids.filter((id) => id !== screen.screenId)
                        : [...ids, screen.screenId]
                    )
                  }
                />
              ) : null}
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm font-medium">{screen.name}</span>
                <span className="text-xs text-muted-foreground">
                  {[
                    screen.city,
                    screen.placeType ? t(`placeType.${screen.placeType}` as MessageId) : null
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                {screen.reasonCode || screen.note ? (
                  <span className="text-xs text-muted-foreground">
                    {[
                      screen.reasonCode ? t(`reason.${screen.reasonCode}` as MessageId) : null,
                      screen.note ? `«${screen.note}»` : null
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                ) : null}
              </div>
              {screen.ratePerFiveSecondsCents !== null ? (
                <span className="font-mono text-[13px]">
                  {t("adNew.ratePer5", {
                    rate: formatCents(screen.ratePerFiveSecondsCents, language)
                  })}
                </span>
              ) : null}
              {!screen.pending ? <AdScreenStatusBadge status={screen.status} /> : null}
              {canManage && (screen.status === "ON_AIR" || screen.status === "SCHEDULED") ? (
                <Button
                  variant="outline"
                  className="border-destructive/30 text-destructive"
                  onClick={() => setStopping(screen)}
                >
                  {t("review.stop")}
                </Button>
              ) : null}
            </div>
          ))}
          {decidable ? (
            <div className="flex flex-col gap-3 border-t border-border px-5 py-4">
              {errorMessage(approve.error, t) ? (
                <Alert tone="error">{errorMessage(approve.error, t)}</Alert>
              ) : null}
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  className="border-destructive/30 text-destructive"
                  onClick={() => setRejecting(true)}
                >
                  {t("review.reject")}
                </Button>
                <Button
                  disabled={selected.length === 0}
                  loading={approve.isPending}
                  onClick={() => approve.mutate({ adId, screenIds: selected })}
                >
                  {selected.length === 1
                    ? t("review.approve.one")
                    : t("review.approve.other", { n: selected.length })}
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      </div>

      {rejecting ? (
        <RejectDialog request={data} onDone={refresh} onClose={() => setRejecting(false)} />
      ) : null}
      {stopping ? (
        <StopDialog
          ad={data}
          screen={stopping}
          onDone={refresh}
          onClose={() => setStopping(null)}
        />
      ) : null}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

/** The ad's file: the image, or the video looping without sound. */
function Preview({ request }: { request: ReviewRequestView }) {
  const { renditions, kind, poster } = request.asset;
  return (
    <div className="flex aspect-video w-full items-center justify-center overflow-hidden bg-black">
      {kind === "IMAGE" && renditions.webp ? (
        <img src={renditions.webp} alt={request.adName} className="size-full object-contain" />
      ) : kind === "VIDEO" && (renditions.mp4 || renditions.webm) ? (
        <video
          src={renditions.mp4 ?? renditions.webm}
          poster={poster ?? undefined}
          className="size-full object-contain"
          muted
          loop
          autoPlay
          playsInline
          controls
        />
      ) : (
        <Icon name="playCircle" className="size-10 text-muted-foreground" />
      )}
    </div>
  );
}

function RejectDialog({
  request,
  onDone,
  onClose
}: {
  request: ReviewRequestView;
  onDone: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [reason, setReason] = useState<ReviewReason>("NOT_SUITABLE_FOR_VENUE");
  const [note, setNote] = useState("");
  const reject = trpc.adReview.reject.useMutation({
    onSuccess: () => {
      onDone();
      onClose();
    }
  });
  const errors = fieldErrors(reject.error);

  return (
    <Dialog
      open
      title={t("review.rejectTitle", { name: request.adName })}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t("dialogs.cancel")}
          </Button>
          <Button
            variant="destructive"
            loading={reject.isPending}
            onClick={() => reject.mutate({ adId: request.adId, reason, note })}
          >
            {t("review.reject")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-left">
        <p>{t("review.rejectBody")}</p>
        {errorMessage(reject.error, t) ? (
          <Alert tone="error">{errorMessage(reject.error, t)}</Alert>
        ) : null}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-foreground">{t("review.reason")}</legend>
          {REVIEW_REASONS.map((value) => (
            <label key={value} className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="reason"
                checked={reason === value}
                onChange={() => setReason(value)}
                className="accent-[var(--color-primary)]"
              />
              {t(`reason.${value}` as MessageId)}
            </label>
          ))}
        </fieldset>
        <NoteField
          label={t(reason === "OTHER" ? "review.noteRequired" : "review.note")}
          value={note}
          onChange={setNote}
          error={errors.note}
        />
      </div>
    </Dialog>
  );
}

/** Pencil owner-revoke-dialog: stop an approved ad on one of the owner's screens, with a note. */
export function StopDialog({
  ad,
  screen,
  onDone,
  onClose
}: {
  ad: { adId: string; adName: string };
  screen: { screenId: string; name: string };
  onDone: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [note, setNote] = useState("");
  const revoke = trpc.adReview.revoke.useMutation({
    onSuccess: () => {
      onDone();
      onClose();
    }
  });
  return (
    <Dialog
      open
      title={t("review.stopTitle", { name: ad.adName, screen: screen.name })}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t("review.keep")}
          </Button>
          <Button
            variant="destructive"
            loading={revoke.isPending}
            onClick={() => revoke.mutate({ adId: ad.adId, screenId: screen.screenId, note })}
          >
            {t("review.stop")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-left">
        <p>{t("review.stopBody")}</p>
        {errorMessage(revoke.error, t) ? (
          <Alert tone="error">{errorMessage(revoke.error, t)}</Alert>
        ) : null}
        <NoteField
          label={t("review.note")}
          value={note}
          onChange={setNote}
          error={fieldErrors(revoke.error).note}
        />
      </div>
    </Dialog>
  );
}

function NoteField({
  label,
  value,
  onChange,
  error
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
      {label}
      <textarea
        value={value}
        maxLength={280}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        className="rounded-2xl border border-input bg-background px-4 py-2 text-sm font-normal outline-none focus:border-foreground aria-invalid:border-destructive"
      />
      {error ? <span className="text-xs font-normal text-destructive">{error}</span> : null}
    </label>
  );
}
