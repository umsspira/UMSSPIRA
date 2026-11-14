"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BriefcaseBusiness, CheckCircle2 } from "lucide-react";
import { formatExperienceDate, type WorkExperience } from "../types/experience";
import { getExperience } from "../services/experience.service";
import { ExperienceShell } from "./experience-shell";

function formatLongDate(value: string) {
  if (!value) return "";
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("es-BO", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1),
  );
}

function getWorkDuration(startDate: string) {
  const [year, month] = startDate.split("-").map(Number);
  const start = new Date(year, month - 1);
  const now = new Date();
  const months = Math.max(
    0,
    (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth(),
  );
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  const duration = [
    years ? `${years} ${years === 1 ? "año" : "años"}` : "",
    remainingMonths ? `${remainingMonths} ${remainingMonths === 1 ? "mes" : "meses"}` : "",
  ].filter(Boolean);
  return duration.length ? duration.join(" ") : "menos de un mes";
}

function getResponsibilities(description: string) {
  return description
    .split(/(?<=[a-záéíóúñ])\.\s+(?=[A-ZÁÉÍÓÚÑ])/i)
    .map((item) => item.trim().replace(/[.]$/, ""))
    .filter(Boolean);
}

export function ExperienceDetail({ experienceId }: { experienceId: string }) {
  const router = useRouter();
  const [experience, setExperience] = useState<WorkExperience | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    // Carga desde el mismo servicio que alimenta el listado y la edición.
    let active = true;

    getExperience(experienceId)
      .then((item) => {
        if (active) setExperience(item);
      })
      .catch((error: unknown) => {
        if (active) {
          const message = error instanceof Error ? error.message : "No se pudo cargar la experiencia.";
          setLoadError(message);
          if (message.includes("No se encontró")) router.replace("/perfil/experiencia-laboral");
        }
      })
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, [experienceId, router]);

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
  if (!experience) return <ExperienceShell><p className="rounded-lg bg-white p-6 text-sm text-slate-500">No se encontró la experiencia solicitada.</p></ExperienceShell>;

  const period = experience.currentlyWorking
    ? `${formatLongDate(experience.startDate)} - Presente (${getWorkDuration(experience.startDate)})`
    : `${formatExperienceDate(experience.startDate)} - ${formatExperienceDate(experience.endDate)}`;

  return (
    <ExperienceShell>
      <main>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.09em] text-slate-500">
          Perfil de vinculación · Experiencia laboral
        </p>
        <Link href="/perfil/experiencia-laboral" className="mb-4 inline-flex items-center gap-2 text-xs font-medium text-[#53677f] hover:text-[#202a3b]">
          <ArrowLeft size={14} />
          Volver al listado
        </Link>

        <article className="max-w-[900px] rounded-lg border border-[#e8e5df] bg-white p-5 shadow-[0_1px_3px_rgba(20,30,50,0.04)] sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e7ebf0] pb-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#e8eff8] text-[#425c7b]">
                <BriefcaseBusiness size={20} />
              </span>
              <div>
                <h1 className="text-lg font-bold text-[#202a3b]">{experience.company}</h1>
                <p className="mt-0.5 text-xs text-slate-600">{experience.position}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e5f7ef] px-3 py-1.5 text-[10px] font-semibold text-[#287452]">
              <CheckCircle2 size={13} />
              Experiencia verificada por el sistema
            </span>
          </div>

          <div className="grid gap-4 border-b border-[#e7ebf0] py-5 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Periodo de trabajo</p>
              <p className="mt-1 text-xs font-semibold text-[#202a3b]">{period}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Tipo de empleo</p>
              <p className="mt-1 text-xs font-semibold text-[#202a3b]">{experience.employmentType}</p>
            </div>
          </div>

          <section className="py-5">
            <h2 className="text-xs font-bold text-[#202a3b]">Funciones y responsabilidades principales</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-relaxed text-slate-600 marker:text-[#77869a]">
              {getResponsibilities(experience.description).map((responsibility, index) => (
                <li key={`${index}-${responsibility}`}>{responsibility}</li>
              ))}
            </ul>
          </section>

          <div className="flex flex-wrap justify-end gap-2 border-t border-[#e7ebf0] pt-4">
            <Link href="/perfil/experiencia-laboral" className="rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              Volver al listado
            </Link>
            <Link href={`/perfil/experiencia-laboral/${encodeURIComponent(experience.id)}/editar`} className="rounded-md bg-[#f2a45b] px-4 py-2 text-xs font-semibold text-[#2c2520] hover:bg-[#e99549]">
              Editar experiencia
            </Link>
          </div>
        </article>
      </main>
    </ExperienceShell>
  );
}
