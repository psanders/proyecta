/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  DR_CITIES,
  ENVIRONMENTS,
  MAX_SCREEN_TAGS,
  ORIENTATIONS,
  PLACE_TYPES,
  RESOLUTION_PRESETS,
  formatPairingCode,
  normalizeResolution,
  parseCoordinates,
  resolveApiMessage,
  resolutionTier,
  type CreateScreenInput,
  type ScreenTag
} from "@proyecta/common";
import { DayPicker } from "../../components/DayPicker.js";
import { MapLink } from "../../components/MapLink.js";
import { BackLink, PageHeader } from "../../components/PageHeader.js";
import { Alert } from "../../components/ui/Alert.js";
import { Button } from "../../components/ui/Button.js";
import { SectionCard } from "../../components/ui/Card.js";
import { SelectField, TextAreaField, TextField } from "../../components/ui/Field.js";
import { TagPicker } from "../../components/TagPicker.js";
import { errorMessage, fieldErrors } from "../../lib/errors.js";
import { formatResolution, resolutionFacets } from "../../lib/format.js";
import { trpc } from "../../lib/trpc.js";
import { useI18n } from "../../lib/useI18n.js";

interface FormState {
  name: string;
  placeType: string;
  environment: string;
  city: string;
  address: string;
  description: string;
  coordinates: string;
  widthCm: string;
  heightCm: string;
  orientation: string;
  resolution: string;
  availableDays: number[];
  startTime: string;
  endTime: string;
  rate: string;
  tags: ScreenTag[];
}

const EMPTY: FormState = {
  name: "",
  placeType: "",
  environment: "",
  city: "",
  address: "",
  description: "",
  coordinates: "",
  widthCm: "",
  heightCm: "",
  orientation: "",
  resolution: "",
  availableDays: [],
  startTime: "",
  endTime: "",
  rate: "",
  tags: []
};

const text = (v: string) => (v.trim() === "" ? undefined : v.trim());
const num = (v: string) => (v.trim() === "" ? undefined : Number(v.replace(/[,\s]/g, "")));
const CUSTOM_RESOLUTION = "custom";

/**
 * `resolution`, omitted when it wasn't touched from what loaded. `updateScreenSchema` now bounds
 * resolution (short side >= 480px, long side <= 20,000px); a screen saved before that rule existed
 * can carry a value outside it. Resending that value unchanged would fail the new check on every
 * save, blocking unrelated edits like a rename. Omitting it instead leaves the stored value exactly
 * as it is — `createUpdateScreen` only writes `resolution` when the field is present.
 */
function toInput(form: FormState, initialResolution: string): CreateScreenInput {
  const coordinates = parseCoordinates(form.coordinates);
  const location = coordinates && "latitude" in coordinates ? coordinates : undefined;
  const resolutionChanged = normalizeResolution(form.resolution) !== initialResolution;
  return {
    name: form.name,
    city: form.city,
    placeType: text(form.placeType) as CreateScreenInput["placeType"],
    environment: text(form.environment) as CreateScreenInput["environment"],
    address: text(form.address),
    description: text(form.description),
    latitude: location?.latitude,
    longitude: location?.longitude,
    tags: form.tags,
    widthCm: num(form.widthCm),
    heightCm: num(form.heightCm),
    orientation: text(form.orientation) as CreateScreenInput["orientation"],
    resolution: resolutionChanged ? text(form.resolution) : undefined,
    availableDays: form.availableDays,
    startTime: text(form.startTime),
    endTime: text(form.endTime),
    ratePerFiveSecondsDollars: num(form.rate)
  };
}

/** Pencil frames add-screen / edit-screen: four form sections, create (and link) or save. */
export function ScreenFormPage() {
  const { t, language } = useI18n();
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const code = params.get("code");
  const existing = trpc.screens.get.useQuery({ id: id ?? "" }, { enabled: !!id });
  const [form, setForm] = useState<FormState>({
    ...EMPTY,
    // New screens default to landscape, as in Pencil.
    orientation: "LANDSCAPE",
    // The player reports what its box outputs; stored landscape like every resolution.
    resolution: normalizeResolution(params.get("resolution") ?? "")
  });
  const [customResolution, setCustomResolution] = useState(false);
  const [coordinatesTouched, setCoordinatesTouched] = useState(false);
  // The resolution a saved screen loaded with, so a save that never touched it can leave it alone
  // (see toInput) instead of resending it and tripping the new bounds on an out-of-bounds legacy
  // value. Empty for a new screen: any resolution entered there counts as touched.
  const [initialResolution, setInitialResolution] = useState("");

  useEffect(() => {
    const s = existing.data;
    if (!s) return;
    setForm({
      name: s.name,
      placeType: s.placeType ?? "",
      environment: s.environment ?? "",
      city: s.city,
      address: s.address ?? "",
      description: s.description ?? "",
      coordinates:
        s.latitude !== null && s.longitude !== null ? `${s.latitude}, ${s.longitude}` : "",
      widthCm: s.widthCm?.toString() ?? "",
      heightCm: s.heightCm?.toString() ?? "",
      orientation: s.orientation ?? "",
      resolution: s.resolution ?? "",
      availableDays: s.availableDays,
      startTime: s.startTime ?? "",
      endTime: s.endTime ?? "",
      rate: s.ratePerFiveSecondsCents !== null ? (s.ratePerFiveSecondsCents / 100).toFixed(2) : "",
      tags: s.tags
    });
    setInitialResolution(s.resolution ?? "");
  }, [existing.data]);

  const create = trpc.screens.create.useMutation();
  const update = trpc.screens.update.useMutation();
  const link = trpc.screens.link.useMutation();
  const mutation = id ? update : create;
  const errors = fieldErrors(mutation.error);
  const failure = errorMessage(mutation.error, t) ?? errorMessage(link.error, t);

  const coordinates = parseCoordinates(form.coordinates);
  const location = coordinates && "latitude" in coordinates ? coordinates : null;
  const coordinatesError =
    (coordinatesTouched && coordinates && "error" in coordinates
      ? resolveApiMessage(coordinates.error, language)
      : undefined) ??
    errors.latitude ??
    errors.longitude;

  const presetResolution = (RESOLUTION_PRESETS as readonly string[]).includes(form.resolution);
  const resolutionChoice =
    customResolution || (form.resolution !== "" && !presetResolution)
      ? CUSTOM_RESOLUTION
      : form.resolution;
  const facets = resolutionFacets(form.resolution, form.orientation, t);
  const resolutionHint =
    resolutionChoice === CUSTOM_RESOLUTION
      ? (facets ?? undefined)
      : [facets, t("form.resolutionOtherHint")].filter(Boolean).join(" — ");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (coordinates && "error" in coordinates) {
      setCoordinatesTouched(true);
      return;
    }
    try {
      const input = toInput(form, initialResolution);
      const saved = id
        ? await update.mutateAsync({ ...input, id })
        : await create.mutateAsync(input);
      if (!id && code) {
        // The screen exists either way; if linking fails the detail page offers to link again.
        await link.mutateAsync({ screenId: saved.id, code }).catch(() => undefined);
      }
      await utils.screens.invalidate();
      navigate(`/screens/${saved.id}`);
    } catch {
      // Errors render from the mutation state.
    }
  };

  const bind = (key: keyof Omit<FormState, "availableDays" | "tags">) => ({
    value: form[key],
    onChange: (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value }),
    error: errors[key]
  });

  return (
    <form className="mx-auto flex w-full max-w-[760px] flex-col gap-6" onSubmit={submit} noValidate>
      <BackLink
        to={id ? `/screens/${id}` : "/"}
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
        <TextAreaField
          label={t("form.description")}
          placeholder={t("form.descriptionPlaceholder")}
          rows={2}
          maxLength={500}
          {...bind("description")}
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
        <TextField
          label={t("form.coordinates")}
          placeholder={t("form.coordinatesPlaceholder")}
          hint={t("form.coordinatesHint")}
          action={<MapLink label={t("form.openMaps")} coordinates={location} />}
          {...bind("coordinates")}
          onBlur={() => setCoordinatesTouched(true)}
          error={coordinatesError}
        />
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
          <SelectField
            label={t("form.resolution")}
            placeholder={t("form.select")}
            options={[
              ...RESOLUTION_PRESETS.map((r) => ({
                value: r,
                label: `${formatResolution(r)} (${t(`resolutionTier.${resolutionTier(r)!}`)})`
              })),
              { value: CUSTOM_RESOLUTION, label: t("form.resolutionOther") }
            ]}
            value={resolutionChoice}
            onChange={(e) => {
              const custom = e.target.value === CUSTOM_RESOLUTION;
              setCustomResolution(custom);
              if (!custom) setForm({ ...form, resolution: e.target.value });
            }}
            error={resolutionChoice === CUSTOM_RESOLUTION ? undefined : errors.resolution}
          />
        </div>
        {resolutionChoice === CUSTOM_RESOLUTION ? (
          <TextField
            label={t("form.resolutionCustom")}
            placeholder={t("form.resolutionPlaceholder")}
            {...bind("resolution")}
            onBlur={() => setForm({ ...form, resolution: normalizeResolution(form.resolution) })}
            hint={resolutionHint}
          />
        ) : resolutionHint ? (
          <p className="-mt-2 text-xs text-muted-foreground">{resolutionHint}</p>
        ) : null}
      </SectionCard>

      <SectionCard
        title={t("form.tags")}
        hint={t("form.tagsHint", { n: form.tags.length, max: MAX_SCREEN_TAGS })}
      >
        <TagPicker
          value={form.tags}
          onChange={(tags) => setForm({ ...form, tags })}
          error={errors.tags}
        />
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
