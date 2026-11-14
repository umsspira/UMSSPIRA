"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  EMPTY_FORM_VALUES,
  hasErrors,
  toPayload,
  validateAcademicEducation,
} from "@/lib/academic-education/form";
import {
  ESTADO_CURSANDO,
  ESTADOS_FORMACION,
  NIVELES_ACADEMICOS,
  TIPOS_FORMACION,
  TITULO_BACHILLER,
  type AcademicEducationFormMode,
  type AcademicEducationFormValues,
  type AcademicEducationPayload,
  type Carrera,
} from "@/components/academic-education/types";
import { FormField, SelectControl, controlClassName, fieldA11y } from "./form-field";

const toOptions = (values: readonly string[]) =>
  values.map((value) => ({ value, label: value }));

const FIELD_ORDER: (keyof AcademicEducationFormValues)[] = [
  "tipoFormacion",
  "institucion",
  "idCarrera",
  "nivelAcademico",
  "estado",
  "anioInicio",
  "anioFin",
  "descripcion",
];

type AcademicEducationFormProps = {
  mode: AcademicEducationFormMode;
  idEgresado: string;
  carreras: Carrera[];
  initialValues?: AcademicEducationFormValues;
  onSubmit: (payload: AcademicEducationPayload) => Promise<void>;
  onCancel: () => void;
};

export function AcademicEducationForm({
  mode,
  idEgresado,
  carreras,
  initialValues = EMPTY_FORM_VALUES,
  onSubmit,
  onCancel,
}: AcademicEducationFormProps) {
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState<
    Partial<Record<keyof AcademicEducationFormValues, boolean>>
  >({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const errors = validateAcademicEducation(values);

  const visibleError = (field: keyof AcademicEducationFormValues) =>
    submitAttempted || touched[field] ? errors[field] : undefined;
  const markTouched =
    (field: keyof AcademicEducationFormValues) => () =>
      setTouched((previous) => ({ ...previous, [field]: true }));

  const setField = <K extends keyof AcademicEducationFormValues>(
    field: K,
    value: AcademicEducationFormValues[K],
  ) => setValues((previous) => ({ ...previous, [field]: value }));

  const handleTipoChange = (value: string) => {
    const tipoFormacion = TIPOS_FORMACION.find((tipo) => tipo === value);
    if (!tipoFormacion) return;
    setValues((previous) => ({
      ...previous,
      tipoFormacion,
      idCarrera: tipoFormacion === "Carrera" ? previous.idCarrera : "",
    }));
  };

  const handleEstadoChange = (estado: string) =>
    setValues((previous) => ({
      ...previous,
      estado,
      actualmenteCursando:
        estado === ESTADO_CURSANDO ? previous.actualmenteCursando : false,
    }));

  const handleCursandoChange = (checked: boolean) =>
    setValues((previous) => ({
      ...previous,
      actualmenteCursando: checked,
      estado: checked ? ESTADO_CURSANDO : previous.estado,
      anioFin: checked ? "" : previous.anioFin,
    }));

  const handleYearChange = (field: "anioInicio" | "anioFin", raw: string) =>
    setField(field, raw.replace(/\D/g, "").slice(0, 4));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitAttempted(true);
    setSubmitError(null);

    if (hasErrors(errors)) {
      const firstInvalid = FIELD_ORDER.find((field) => errors[field]);
      if (firstInvalid) document.getElementById(firstInvalid)?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(toPayload(values, idEgresado, carreras));
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la formación. Inténtalo nuevamente.",
      );
      setIsSubmitting(false);
    }
  }

  const isCarrera = values.tipoFormacion === "Carrera";
  const isBachiller = values.tipoFormacion === "Bachiller";

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-2xl border border-zinc-200 bg-white shadow-sm"
    >
      <div className="flex flex-col gap-6 p-6 sm:p-8">
        {submitError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {submitError}
          </div>
        )}
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            id="tipoFormacion"
            label="Tipo de formación"
            required
            error={visibleError("tipoFormacion")}
          >
            <SelectControl
              {...fieldA11y("tipoFormacion", visibleError("tipoFormacion"))}
              value={values.tipoFormacion}
              onChange={(event) => handleTipoChange(event.target.value)}
              onBlur={markTouched("tipoFormacion")}
              placeholder="Selecciona el tipo de formación"
              options={toOptions(TIPOS_FORMACION)}
            />
          </FormField>
          <FormField
            id="institucion"
            label="Institución educativa"
            required
            error={visibleError("institucion")}
          >
            <input
              {...fieldA11y("institucion", visibleError("institucion"))}
              type="text"
              className={controlClassName}
              value={values.institucion}
              onChange={(event) => setField("institucion", event.target.value)}
              onBlur={markTouched("institucion")}
              placeholder="Ej. Universidad Mayor de San Simón"
              maxLength={100}
              autoComplete="organization"
            />
          </FormField>
          <FormField
            id="idCarrera"
            label="Carrera o programa"
            required={isCarrera}
            error={visibleError("idCarrera")}
            hint={
              isBachiller
                ? `El título se registrará automáticamente como “${TITULO_BACHILLER}”.`
                : !values.tipoFormacion
                  ? "Selecciona primero el tipo de formación."
                  : undefined
            }
            className="sm:col-span-2"
          >
            {isBachiller ? (
              <input
                {...fieldA11y("idCarrera", undefined, true)}
                type="text"
                className={controlClassName}
                value={TITULO_BACHILLER}
                disabled
                readOnly
              />
            ) : (
              <SelectControl
                {...fieldA11y(
                  "idCarrera",
                  visibleError("idCarrera"),
                  !values.tipoFormacion,
                )}
                value={values.idCarrera}
                onChange={(event) => setField("idCarrera", event.target.value)}
                onBlur={markTouched("idCarrera")}
                disabled={!isCarrera}
                placeholder="Selecciona una carrera o programa"
                options={carreras.map((career) => ({
                  value: career.idCarrera,
                  label: career.nombre,
                }))}
              />
            )}
          </FormField>
          <FormField
            id="nivelAcademico"
            label="Grado o nivel académico"
            required
            error={visibleError("nivelAcademico")}
          >
            <SelectControl
              {...fieldA11y("nivelAcademico", visibleError("nivelAcademico"))}
              value={values.nivelAcademico}
              onChange={(event) => setField("nivelAcademico", event.target.value)}
              onBlur={markTouched("nivelAcademico")}
              placeholder="Selecciona el nivel"
              options={toOptions(NIVELES_ACADEMICOS)}
            />
          </FormField>
          <FormField
            id="estado"
            label="Estado"
            required
            error={visibleError("estado")}
          >
            <SelectControl
              {...fieldA11y("estado", visibleError("estado"))}
              value={values.estado}
              onChange={(event) => handleEstadoChange(event.target.value)}
              onBlur={markTouched("estado")}
              placeholder="Selecciona el estado"
              options={toOptions(ESTADOS_FORMACION)}
            />
          </FormField>
          <FormField
            id="anioInicio"
            label="Año de inicio"
            required
            error={visibleError("anioInicio")}
          >
            <input
              {...fieldA11y("anioInicio", visibleError("anioInicio"))}
              type="text"
              inputMode="numeric"
              className={controlClassName}
              value={values.anioInicio}
              onChange={(event) => handleYearChange("anioInicio", event.target.value)}
              onBlur={markTouched("anioInicio")}
              placeholder="AAAA"
              maxLength={4}
            />
          </FormField>
          <FormField
            id="anioFin"
            label="Año de finalización"
            error={visibleError("anioFin")}
          >
            <input
              {...fieldA11y("anioFin", visibleError("anioFin"))}
              type="text"
              inputMode="numeric"
              className={controlClassName}
              value={values.anioFin}
              onChange={(event) => handleYearChange("anioFin", event.target.value)}
              onBlur={markTouched("anioFin")}
              placeholder={values.actualmenteCursando ? "En curso" : "AAAA"}
              maxLength={4}
              disabled={values.actualmenteCursando}
            />
          </FormField>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label
              htmlFor="actualmenteCursando"
              className="flex w-fit cursor-pointer items-center gap-2.5"
            >
              <input
                id="actualmenteCursando"
                type="checkbox"
                className="size-4 cursor-pointer rounded border-zinc-300 accent-orange-600"
                checked={values.actualmenteCursando}
                onChange={(event) => handleCursandoChange(event.target.checked)}
                aria-describedby="actualmenteCursando-hint"
              />
              <span className="text-sm font-medium text-zinc-900">
                Actualmente cursando
              </span>
            </label>
            <p id="actualmenteCursando-hint" className="pl-6 text-xs text-zinc-500">
              Al marcar esta opción, el año de finalización se deshabilitará.
            </p>
          </div>
          <FormField
            id="descripcion"
            label="Descripción"
            error={visibleError("descripcion")}
            className="sm:col-span-2"
          >
            <textarea
              {...fieldA11y("descripcion", visibleError("descripcion"))}
              className={`${controlClassName} min-h-28 resize-y`}
              value={values.descripcion}
              onChange={(event) => setField("descripcion", event.target.value)}
              onBlur={markTouched("descripcion")}
              placeholder="Describe logros académicos relevantes..."
              maxLength={250}
            />
          </FormField>
        </div>
      </div>
      <div className="flex flex-col-reverse gap-3 border-t border-zinc-200 px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
        <button
          type="button"
          className="h-10 rounded-lg border border-zinc-300 px-5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-orange-600 px-5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {mode === "create" ? "Guardar formación" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
