"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Info, Pencil, Plus, Trash2 } from "lucide-react";
import { formatExperienceDate, type WorkExperience } from "../types/experience";
import { deleteExperience, getExperiences } from "../services/experience.service";
import { ExperienceShell } from "./experience-shell";

// La lista lee del servicio compartido con las pantallas de detalle y edición.
export function ExperienceList() {
  const [experiences, setExperiences] = useState<WorkExperience[]>([]);
  const [ready, setReady] = useState(false);
  const [reload, setReload] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WorkExperience | null>(null);

  useEffect(() => {
    let active = true;

    getExperiences()
      .then((items) => {
        if (active) setExperiences(items);
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(error instanceof Error ? error.message : "No se pudieron cargar las experiencias.");
        }
      })
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, [reload]);

  async function removeExperience() {
    if (!deleteTarget) return;
    setActionError("");
    setIsDeleting(true);

    try {
      await deleteExperience(deleteTarget.id);
      setExperiences((current) => current.filter((experience) => experience.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "No se pudo eliminar la experiencia.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <ExperienceShell>
      <main>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.09em] text-slate-500">
              Perfil de vinculación · Experiencia laboral
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-[#202a3b]">Mi experiencia laboral</h1>
            <p className="mt-1 max-w-2xl text-xs text-slate-600">
              Consulta y actualiza tu trayectoria profesional para mantener completo tu perfil.
            </p>
          </div>
          <Link
            href="/perfil/experiencia-laboral/agregar"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-[#f2a45b] px-4 text-xs font-semibold text-[#2c2520] shadow-sm transition hover:bg-[#e99549]"
          >
            <Plus size={15} />
            Agregar experiencia
          </Link>
        </div>

        <div className="space-y-3">
          {!ready ? (
            <div className="rounded-lg bg-white p-6 text-sm text-slate-500">Cargando experiencias...</div>
          ) : loadError ? (
            <div className="rounded-lg border border-red-200 bg-white p-6 text-sm text-red-700" role="alert">
              <p>{loadError}</p>
              <button
                className="mt-3 rounded-md border border-red-300 px-3 py-2 text-xs font-semibold"
                onClick={() => {
                  setReady(false);
                  setLoadError("");
                  setReload((current) => current + 1);
                }}
                type="button"
              >
                Reintentar
              </button>
            </div>
          ) : experiences.length === 0 ? (
            <div className="rounded-lg bg-white p-8 text-center">
              <h2 className="font-semibold">Aún no tienes experiencias laborales</h2>
              <p className="mt-1 text-sm text-slate-500">Agrega tu trayectoria para mejorar la compatibilidad con vacantes.</p>
              <Link href="/perfil/experiencia-laboral/agregar" className="mt-4 inline-flex rounded-md bg-[#f2a45b] px-4 py-2 text-sm font-semibold">
                Agregar experiencia
              </Link>
            </div>
          ) : (
            experiences.map((experience) => (
              <article key={experience.id} className="rounded-lg border border-[#e8e5df] bg-white px-5 py-4 shadow-[0_1px_3px_rgba(20,30,50,0.04)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-bold text-[#202a3b]">
                        <Link href={`/perfil/experiencia-laboral/${encodeURIComponent(experience.id)}`} className="hover:underline">
                          {experience.company}
                        </Link>
                      </h2>
                      {experience.currentlyWorking && (
                        <span className="inline-flex items-center gap-1 rounded bg-[#e9f1fa] px-2 py-0.5 text-[9px] font-semibold text-[#385270]">
                          <CheckCircle2 size={10} />
                          {formatExperienceDate(experience.startDate)} - Presente
                        </span>
                      )}
                      {!experience.currentlyWorking && (
                        <span className="rounded bg-[#e9f1fa] px-2 py-0.5 text-[9px] font-semibold text-[#385270]">
                          {formatExperienceDate(experience.startDate)} - {formatExperienceDate(experience.endDate)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs font-semibold text-slate-700">{experience.position}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{experience.description}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link
                      aria-label={`Editar experiencia en ${experience.company}`}
                      href={`/perfil/experiencia-laboral/${encodeURIComponent(experience.id)}/editar`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[#e1e7ef] px-2.5 py-2 text-xs font-semibold text-[#35516e] hover:bg-[#f2f6fa]"
                    >
                      <Pencil size={14} />
                      Editar
                    </Link>
                    <button
                      aria-label={`Eliminar experiencia en ${experience.company}`}
                      onClick={() => {
                        setActionError("");
                        setDeleteTarget(experience);
                      }}
                      className="rounded-md border border-[#f1dddd] p-2 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-md border border-[#d7e2f4] bg-[#eef4ff] px-3 py-3 text-[11px] text-[#445b7b]">
          <Info size={14} className="shrink-0" />
          Tu experiencia laboral forma parte de tu perfil profesional y puede complementar tus habilidades al explorar vacantes.
        </div>
      </main>

      {deleteTarget && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#152033]/40 p-4" role="presentation">
          <section
            aria-labelledby="delete-title"
            aria-modal="true"
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            role="dialog"
          >
            <h2 id="delete-title" className="text-lg font-bold">Eliminar experiencia laboral</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              ¿Estás seguro de que deseas eliminar la experiencia en &ldquo;{deleteTarget.company}&rdquo; como &ldquo;{deleteTarget.position}&rdquo; de tu perfil? Esta acción no se puede deshacer.
            </p>
            {actionError && <p className="mt-3 text-sm text-red-700" role="alert">{actionError}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button disabled={isDeleting} onClick={() => setDeleteTarget(null)} className="rounded-md border border-slate-300 px-4 py-2 text-sm disabled:opacity-60">Cancelar</button>
              <button disabled={isDeleting} onClick={removeExperience} className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">{isDeleting ? "Eliminando..." : "Eliminar"}</button>
            </div>
          </section>
        </div>
      )}
    </ExperienceShell>
  );
}
