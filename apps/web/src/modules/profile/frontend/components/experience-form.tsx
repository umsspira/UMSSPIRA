"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import type { ExperienceInput } from "../types/experience";
import {
  createExperience,
  getExperience,
  updateExperience,
} from "../services/experience.service";
import { ExperienceShell } from "./experience-shell";

// Estos son los campos que valida y persiste el servicio de experiencia.
const initialForm: ExperienceInput = {
  company: "",
  position: "",
  startDate: "",
  endDate: "",
  currentlyWorking: false,
  employmentType: "",
  description: "",
};

function dateForInput(value: string) {
  if (!value) return "";
  return value.length === 7 ? `${value}-01` : value;
}

export function ExperienceForm({ experienceId }: { experienceId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<string[]>([]);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [ready, setReady] = useState(!experienceId);
  const isEditing = Boolean(experienceId);

  useEffect(() => {
    if (!experienceId) return;

    // Precarga por identificador para editar el dato persistido.
    let active = true;
    getExperience(experienceId)
      .then((experience) => {
        if (active) {
          setForm({
            company: experience.company,
            position: experience.position,
            startDate: dateForInput(experience.startDate),
            endDate: dateForInput(experience.endDate),
            currentlyWorking: experience.currentlyWorking,
            employmentType: experience.employmentType,
            description: experience.description,
          });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(error instanceof Error ? error.message : "No se pudo cargar la experiencia.");
        }
      })
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, [experienceId, router]);

  function updateField<K extends keyof typeof initialForm>(field: K, value: (typeof initialForm)[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => current.filter((error) => error !== field));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");
    const requiredErrors = [
      !form.company.trim() ? "company" : "",
      !form.position.trim() ? "position" : "",
      !form.startDate ? "startDate" : "",
      !form.employmentType ? "employmentType" : "",
      !form.description.trim() ? "description" : "",
      !form.currentlyWorking && !form.endDate ? "endDate" : "",
    ].filter(Boolean);

    if (requiredErrors.length) {
      setErrors(requiredErrors);
      return;
    }
    if (!form.currentlyWorking && form.endDate < form.startDate) {
      setErrors(["endDate"]);
      return;
    }

    const experience: ExperienceInput = {
      ...form,
      endDate: form.currentlyWorking ? "" : form.endDate,
    };

    // Confirma la persistencia antes de volver al listado.
    setIsSaving(true);
    try {
      if (experienceId) {
        await updateExperience(experienceId, experience);
      } else {
        await createExperience(experience);
      }
      router.push("/perfil/experiencia-laboral");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "No se pudo guardar la experiencia.");
    } finally {
      setIsSaving(false);
    }
  }

  const inputClass = (field: string) =>
    `mt-1 block w-full rounded-md border bg-white px-3 py-2 text-xs text-[#202a3b] outline-none placeholder:text-slate-400 focus:border-[#7894b2] focus:ring-2 focus:ring-[#dce6f0] ${
      errors.includes(field) ? "border-red-400" : "border-[#d9dfe7]"
    }`;

  if (!ready) {
    return <ExperienceShell><p className="rounded-lg bg-white p-6 text-sm text-slate-500">Cargando experiencia...</p></ExperienceShell>;
  }
  if (loadError) {
    return (
      <ExperienceShell>
        <div className="rounded-lg border border-red-200 bg-white p-6 text-sm text-red-700" role="alert">
          <p>{loadError}</p>
          <Link href="/perfil/experiencia-laboral" className="mt-4 inline-flex text-xs font-semibold underline">
            Volver al listado
          </Link>
        </div>
      </ExperienceShell>
    );
  }

  return (
    <ExperienceShell>
      <main>
        <Link href="/perfil/experiencia-laboral" className="mb-4 inline-flex items-center gap-2 text-xs font-medium text-[#53677f] hover:text-[#202a3b]">
          <ArrowLeft size={14} />
          Volver al listado
        </Link>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.09em] text-slate-500">
          Perfil de vinculación · Experiencia laboral
        </p>
        <h1 className="mb-5 text-2xl font-bold tracking-tight text-[#202a3b]">
          {isEditing ? "Editar experiencia" : "Agregar experiencia laboral"}
        </h1>

        <form onSubmit={handleSubmit} noValidate className="max-w-[760px] rounded-lg border border-[#e8e5df] bg-white p-5 shadow-[0_1px_3px_rgba(20,30,50,0.04)] sm:p-7">
          {errors.length > 0 && (
            <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              Por favor, corrige los campos obligatorios antes de continuar.
            </div>
          )}
          {submitError && (
            <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {submitError}
            </div>
          )}

          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <label className="text-xs font-semibold">
              Nombre de la empresa <span className="text-red-600">*</span>
              <input
                autoComplete="organization"
                className={inputClass("company")}
                onChange={(event) => updateField("company", event.target.value)}
                placeholder="Ej. Tech Solutions Bolivia"
                value={form.company}
              />
              {errors.includes("company") && <span className="mt-1 block font-normal text-red-600">Este campo es obligatorio</span>}
            </label>

            <label className="text-xs font-semibold">
              Cargo desempeñado <span className="text-red-600">*</span>
              <input
                className={inputClass("position")}
                onChange={(event) => updateField("position", event.target.value)}
                placeholder="Ej. Desarrollador Web Junior"
                value={form.position}
              />
              {errors.includes("position") && <span className="mt-1 block font-normal text-red-600">Este campo es obligatorio</span>}
            </label>

            <label className="text-xs font-semibold">
              Fecha de inicio <span className="text-red-600">*</span>
              <input
                className={inputClass("startDate")}
                onChange={(event) => updateField("startDate", event.target.value)}
                type="date"
                value={form.startDate}
              />
              {errors.includes("startDate") && <span className="mt-1 block font-normal text-red-600">Selecciona la fecha de inicio</span>}
            </label>

            <label className="text-xs font-semibold">
              Fecha de finalización {!form.currentlyWorking && <span className="text-red-600">*</span>}
              <input
                className={inputClass("endDate")}
                disabled={form.currentlyWorking}
                max="9999-12-31"
                min={form.startDate || undefined}
                onChange={(event) => updateField("endDate", event.target.value)}
                type="date"
                value={form.endDate}
              />
              {errors.includes("endDate") && (
                <span className="mt-1 block font-normal text-red-600">
                  {form.endDate ? "La fecha de finalización debe ser posterior a la de inicio" : "Selecciona la fecha de finalización"}
                </span>
              )}
            </label>

            <label className="flex items-center gap-2 text-xs sm:col-span-2">
              <input
                checked={form.currentlyWorking}
                className="h-4 w-4 rounded border-slate-300 accent-[#334d68]"
                onChange={(event) => {
                  const currentlyWorking = event.target.checked;
                  setForm((current) => ({ ...current, currentlyWorking, endDate: currentlyWorking ? "" : current.endDate }));
                  setErrors((current) => current.filter((error) => error !== "endDate"));
                }}
                type="checkbox"
              />
              Actualmente trabajo aquí
            </label>

            <label className="text-xs font-semibold sm:col-span-2">
              Tipo de empleo <span className="text-red-600">*</span>
              <select
                className={inputClass("employmentType")}
                onChange={(event) => updateField("employmentType", event.target.value)}
                value={form.employmentType}
              >
                <option value="">Selecciona el tipo de empleo</option>
                <option>No especificado</option>
                <option>Tiempo completo</option>
                <option>Medio tiempo</option>
                <option>Contrato</option>
                <option>Práctica profesional</option>
                <option>Freelance</option>
                <option>Por temporada</option>
              </select>
              {errors.includes("employmentType") && <span className="mt-1 block font-normal text-red-600">Este campo es obligatorio</span>}
            </label>

            <label className="text-xs font-semibold sm:col-span-2">
              Descripción de funciones realizadas <span className="text-red-600">*</span>
              <textarea
                className={`${inputClass("description")} min-h-28 resize-y`}
                maxLength={1500}
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="Describe las principales funciones y responsabilidades desempeñadas en tu cargo..."
                value={form.description}
              />
              {errors.includes("description") && <span className="mt-1 block font-normal text-red-600">Describe al menos una función realizada</span>}
            </label>
          </div>

          <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Link href="/perfil/experiencia-laboral" className="rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              Cancelar
            </Link>
            <button disabled={isSaving} type="submit" className="rounded-md bg-[#f2a45b] px-4 py-2 text-xs font-semibold text-[#2c2520] shadow-sm hover:bg-[#e99549] disabled:opacity-60">
              {isSaving ? "Guardando..." : isEditing ? "Guardar cambios" : "Guardar experiencia"}
            </button>
          </div>
        </form>
      </main>
    </ExperienceShell>
  );
}
