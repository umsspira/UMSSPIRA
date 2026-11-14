"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, GraduationCap, Info, Plus } from "lucide-react";
import { useAcademicEducation } from "@/hooks/use-academic-education";
import type { AcademicEducation } from "@/components/academic-education/types";
import { AcademicEducationCard } from "./academic-education-card";
import { DeleteAcademicEducationModal } from "./delete-academic-education-modal";
import { PROFILE_CRUMB } from "./page-heading";

export function AcademicEducationList() {
  const { records, isLoading, error, remove } = useAcademicEducation();
  const [pendingDelete, setPendingDelete] = useState<AcademicEducation | null>(null);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-7">
        <nav aria-label="Ruta de navegación" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1 text-xs uppercase tracking-wide text-zinc-600">
            <li>
              <Link href={PROFILE_CRUMB.href} className="transition-colors hover:text-orange-600">
                {PROFILE_CRUMB.label}
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="size-3" />
            </li>
            <li aria-current="page" className="font-semibold text-zinc-900">
              Mi formación académica
            </li>
          </ol>
        </nav>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Mi formación académica</h1>
            <p className="mt-1 max-w-xs text-sm leading-6 text-zinc-600">
              Gestiona tu formación académica para mantener actualizado tu perfil profesional.
            </p>
          </div>
          <Link
            href="/perfil/formacion/agregar"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 self-end rounded-lg bg-orange-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
          >
            <Plus className="size-4" aria-hidden="true" />
            Agregar formación
          </Link>
        </div>
      </div>
      <section
        aria-labelledby="academic-education-list-title"
        className="overflow-hidden rounded-lg border border-zinc-100 bg-white shadow-sm"
      >
        <div className="flex flex-wrap items-center gap-2 px-5 py-6 sm:px-6">
          <h2 id="academic-education-list-title" className="text-sm font-semibold text-zinc-900">
            Formación académica registrada en tu perfil
          </h2>
          {!isLoading && !error && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
              {records.length} {records.length === 1 ? "registro activo" : "registros activos"}
            </span>
          )}
        </div>
        {isLoading ? (
          <div className="flex flex-col gap-3 px-5 pb-6 sm:px-6" aria-busy="true">
            {[0, 1].map((item) => (
              <div key={item} className="h-28 animate-pulse rounded-xl bg-zinc-100" />
            ))}
          </div>
        ) : error ? (
          <p role="alert" className="px-5 py-10 text-center text-sm text-red-700">
            No se pudo cargar tu formación académica.
          </p>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-blue-100 text-blue-950">
              <GraduationCap className="size-6" aria-hidden="true" />
            </span>
            <p className="font-medium text-zinc-900">
              Aún no registraste formación académica
            </p>
            <p className="max-w-sm text-sm text-zinc-600">
              Agrega tu bachillerato o carrera para completar tu perfil profesional.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {records.map((record) => (
              <li key={record.idFormacion}>
                <AcademicEducationCard record={record} onDelete={setPendingDelete} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <aside className="mt-8 flex items-center gap-3 rounded-lg bg-[#d9e2ff] px-5 py-5 text-sm leading-6 text-slate-900">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-white">
          <Info className="size-4" aria-hidden="true" />
        </span>
        <p>
          Tu formación académica forma parte de tu perfil profesional y puede ser considerada en la compatibilidad con las vacantes.
        </p>
      </aside>
      <DeleteAcademicEducationModal
        record={pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={(record) => remove(record.idFormacion)}
      />
    </main>
  );
}
