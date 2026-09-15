/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  DR_CITIES,
  ENVIRONMENT_LABELS,
  ORIENTATION_LABELS,
  PLACE_TYPES,
  PLACE_TYPE_LABELS,
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
import { strings } from "../../strings.js";

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

const optionsOf = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));
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
    ratePerFiveSecondsPesos: num(form.rate)
  };
}

/** Pencil frames add-screen / edit-screen: four form sections, create (and link) or save. */
export function ScreenFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const code = params.get("codigo");
  const existing = trpc.screens.get.useQuery({ id: id ?? "" }, { enabled: !!id });
  const [form, setForm] = useState<FormState>({
    ...EMPTY,
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
  const failure = errorMessage(mutation.error) ?? errorMessage(link.error);

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
    <form className="flex max-w-[760px] flex-col gap-6" onSubmit={submit} noValidate>
      <BackLink
        to={id ? `/pantallas/${id}` : "/"}
        label={id ? `Volver a ${existing.data?.name ?? ""}` : strings.detail.back}
      />
      <PageHeader
        title={id ? strings.form.editTitle : strings.form.newTitle}
        subtitle={id ? strings.form.editSubtitle : strings.form.newSubtitle}
      />
      {code ? (
        <Alert tone="info">{strings.form.pairingNotice(formatPairingCode(code))}</Alert>
      ) : null}
      {failure ? <Alert tone="error">{failure}</Alert> : null}

      <SectionCard title={strings.form.basic} hint={strings.form.basicHint}>
        <TextField
          label={strings.form.name}
          placeholder={strings.form.namePlaceholder}
          {...bind("name")}
        />
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label={strings.form.placeType}
            placeholder={strings.form.select}
            options={PLACE_TYPES.map((p) => ({ value: p, label: PLACE_TYPE_LABELS[p] }))}
            {...bind("placeType")}
          />
          <SelectField
            label={strings.form.environment}
            placeholder={strings.form.select}
            options={optionsOf(ENVIRONMENT_LABELS)}
            {...bind("environment")}
          />
          <TextField
            label={strings.form.city}
            placeholder={strings.form.cityPlaceholder}
            list="dr-cities"
            {...bind("city")}
          />
          <TextField
            label={strings.form.address}
            placeholder={strings.form.addressPlaceholder}
            {...bind("address")}
          />
        </div>
        <datalist id="dr-cities">
          {DR_CITIES.map((city) => (
            <option key={city} value={city} />
          ))}
        </datalist>
      </SectionCard>

      <SectionCard title={strings.form.technical} hint={strings.form.technicalHint}>
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label={strings.form.width}
            inputMode="numeric"
            placeholder="Ej. 480"
            {...bind("widthCm")}
          />
          <TextField
            label={strings.form.height}
            inputMode="numeric"
            placeholder="Ej. 270"
            {...bind("heightCm")}
          />
          <SelectField
            label={strings.form.orientation}
            placeholder={strings.form.select}
            options={optionsOf(ORIENTATION_LABELS)}
            {...bind("orientation")}
          />
          <TextField
            label={strings.form.resolution}
            placeholder={strings.form.resolutionPlaceholder}
            {...bind("resolution")}
          />
        </div>
      </SectionCard>

      <SectionCard title={strings.form.availability} hint={strings.form.availabilityHint}>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{strings.form.days}</span>
          <DayPicker
            value={form.availableDays}
            onChange={(availableDays) => setForm({ ...form, availableDays })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextField label={strings.form.start} type="time" {...bind("startTime")} />
          <TextField label={strings.form.end} type="time" {...bind("endTime")} />
        </div>
      </SectionCard>

      <SectionCard title={strings.form.commercial} hint={strings.form.commercialHint}>
        <TextField
          label={strings.form.rate}
          inputMode="decimal"
          placeholder={strings.form.ratePlaceholder}
          hint={strings.form.rateHelper}
          {...bind("rate")}
        />
      </SectionCard>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => navigate(-1)}>
          {strings.form.cancel}
        </Button>
        <Button type="submit" loading={mutation.isPending || link.isPending}>
          {id ? strings.form.save : strings.form.create}
        </Button>
      </div>
    </form>
  );
}
