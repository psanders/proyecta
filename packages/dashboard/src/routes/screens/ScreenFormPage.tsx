/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  DR_CITIES,
  ENVIRONMENTS,
  ORIENTATIONS,
  PLACE_TYPES,
  formatPairingCode,
  type CreateScreenInput
} from "@proyecta/common";
import { DayPicker } from "../../components/DayPicker.js";
import { BackLink, PageHeader } from "../../components/PageHeader.js";
import { Alert } from "../../components/ui/Alert.js";
import { Button } from "../../components/ui/Button.js";
import { SectionCard } from "../../components/ui/Card.js";
import { SelectField, TextField } from "../../components/ui/Field.js";
import { errorMessage, fieldErrors } from "../../lib/errors.js";
import { trpc } from "../../lib/trpc.js";
import { useI18n } from "../../lib/useI18n.js";

interface FormState {
  name: string;
  placeType: string;
  environment: string;
  city: string;
  address: string;
  widthCm: string;
  heightCm: string;
  orientation: string;
  resolution: string;
  availableDays: number[];
  startTime: string;
  endTime: string;
  rate: string;
}

const EMPTY: FormState = {
  name: "",
  placeType: "",
  environment: "",
  city: "",
  address: "",
  widthCm: "",
  heightCm: "",
  orientation: "",
  resolution: "",
  availableDays: [],
  startTime: "",
  endTime: "",
  rate: ""
};

const text = (v: string) => (v.trim() === "" ? undefined : v.trim());
const num = (v: string) => (v.trim() === "" ? undefined : Number(v.replace(/[,\s]/g, "")));

function toInput(form: FormState): CreateScreenInput {
  return {
    name: form.name,
    city: form.city,
    placeType: text(form.placeType) as CreateScreenInput["placeType"],
    environment: text(form.environment) as CreateScreenInput["environment"],
    address: text(form.address),
    widthCm: num(form.widthCm),
    heightCm: num(form.heightCm),
    orientation: text(form.orientation) as CreateScreenInput["orientation"],
    resolution: text(form.resolution),
    availableDays: form.availableDays,
    startTime: text(form.startTime),
    endTime: text(form.endTime),
    ratePerFiveSecondsDollars: num(form.rate)
  };
}

/** Pencil frames add-screen / edit-screen: four form sections, create (and link) or save. */
export function ScreenFormPage() {
  const { t } = useI18n();
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const code = params.get("codigo");
  const existing = trpc.screens.get.useQuery({ id: id ?? "" }, { enabled: !!id });
  const [form, setForm] = useState<FormState>({
    ...EMPTY,
    // New screens default to landscape, as in Pencil.
    orientation: "LANDSCAPE",
    resolution: params.get("resolucion") ?? ""
  });

  useEffect(() => {
    const s = existing.data;
    if (!s) return;
    setForm({
      name: s.name,
      placeType: s.placeType ?? "",
      environment: s.environment ?? "",
      city: s.city,
      address: s.address ?? "",
      widthCm: s.widthCm?.toString() ?? "",
      heightCm: s.heightCm?.toString() ?? "",
      orientation: s.orientation ?? "",
      resolution: s.resolution ?? "",
      availableDays: s.availableDays,
      startTime: s.startTime ?? "",
      endTime: s.endTime ?? "",
      rate: s.ratePerFiveSecondsCents !== null ? (s.ratePerFiveSecondsCents / 100).toFixed(2) : ""
    });
  }, [existing.data]);

  const create = trpc.screens.create.useMutation();
  const update = trpc.screens.update.useMutation();
  const link = trpc.screens.link.useMutation();
  const mutation = id ? update : create;
  const errors = fieldErrors(mutation.error);
  const failure = errorMessage(mutation.error, t) ?? errorMessage(link.error, t);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const input = toInput(form);
      const saved = id
        ? await update.mutateAsync({ ...input, id })
        : await create.mutateAsync(input);
      if (!id && code) {
        // The screen exists either way; if linking fails the detail page offers to link again.
        await link.mutateAsync({ screenId: saved.id, code }).catch(() => undefined);
      }
      await utils.screens.invalidate();
      navigate(`/pantallas/${saved.id}`);
    } catch {
      // Errors render from the mutation state.
    }
  };

  const bind = (key: keyof Omit<FormState, "availableDays">) => ({
    value: form[key],
    onChange: (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value }),
    error: errors[key]
  });

  return (
    <form className="mx-auto flex w-full max-w-[760px] flex-col gap-6" onSubmit={submit} noValidate>
      <BackLink
        to={id ? `/pantallas/${id}` : "/"}
        label={id ? t("form.backTo", { name: existing.data?.name ?? "" }) : t("detail.back")}
      />
      <PageHeader
        title={id ? t("form.editTitle") : t("form.newTitle")}
        subtitle={id ? t("form.editSubtitle") : t("form.newSubtitle")}
      />
      {code ? (
        <Alert tone="info" title={t("form.pairingNoticeTitle", { code: formatPairingCode(code) })}>
          {t("form.pairingNoticeBody")}
        </Alert>
      ) : null}
      {failure ? <Alert tone="error">{failure}</Alert> : null}

      <SectionCard title={t("form.basic")} hint={t("form.basicHint")}>
        <TextField
          label={t("form.name")}
          placeholder={t("form.namePlaceholder")}
          {...bind("name")}
        />
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label={t("form.placeType")}
            placeholder={t("form.placeTypePlaceholder")}
            options={PLACE_TYPES.map((p) => ({ value: p, label: t(`placeType.${p}`) }))}
            {...bind("placeType")}
          />
          <SelectField
            label={t("form.environment")}
            placeholder={t("form.environmentPlaceholder")}
            options={ENVIRONMENTS.map((e) => ({ value: e, label: t(`environment.${e}`) }))}
            {...bind("environment")}
          />
          <TextField
            label={t("form.city")}
            placeholder={t("form.cityPlaceholder")}
            list="dr-cities"
            {...bind("city")}
          />
          <TextField
            label={t("form.address")}
            placeholder={t("form.addressPlaceholder")}
            {...bind("address")}
          />
        </div>
        <datalist id="dr-cities">
          {DR_CITIES.map((city) => (
            <option key={city} value={city} />
          ))}
        </datalist>
      </SectionCard>

      <SectionCard title={t("form.technical")} hint={t("form.technicalHint")}>
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label={t("form.width")}
            inputMode="numeric"
            placeholder={t("form.widthPlaceholder")}
            {...bind("widthCm")}
          />
          <TextField
            label={t("form.height")}
            inputMode="numeric"
            placeholder={t("form.heightPlaceholder")}
            {...bind("heightCm")}
          />
          <SelectField
            label={t("form.orientation")}
            placeholder={t("form.select")}
            options={ORIENTATIONS.map((o) => ({ value: o, label: t(`orientation.${o}`) }))}
            {...bind("orientation")}
          />
          <TextField
            label={t("form.resolution")}
            placeholder={t("form.resolutionPlaceholder")}
            {...bind("resolution")}
          />
        </div>
      </SectionCard>

      <SectionCard title={t("form.availability")} hint={t("form.availabilityHint")}>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{t("form.days")}</span>
          <DayPicker
            value={form.availableDays}
            onChange={(availableDays) => setForm({ ...form, availableDays })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label={t("form.start")}
            inputMode="numeric"
            maxLength={5}
            placeholder={t("form.startPlaceholder")}
            {...bind("startTime")}
          />
          <TextField
            label={t("form.end")}
            inputMode="numeric"
            maxLength={5}
            placeholder={t("form.endPlaceholder")}
            {...bind("endTime")}
          />
        </div>
      </SectionCard>

      <SectionCard title={t("form.commercial")} hint={t("form.commercialHint")}>
        <TextField
          label={t("form.rate")}
          inputMode="decimal"
          placeholder={t("form.ratePlaceholder")}
          hint={t("form.rateHelper")}
          {...bind("rate")}
        />
      </SectionCard>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => navigate(-1)}>
          {t("form.cancel")}
        </Button>
        <Button type="submit" loading={mutation.isPending || link.isPending}>
          {id ? t("form.save") : t("form.create")}
        </Button>
      </div>
    </form>
  );
}
