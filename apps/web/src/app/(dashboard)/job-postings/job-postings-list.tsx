"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import { listJobPostings, type JobPosting } from "@/shared/services/job-postings";

type ListState =
  | { kind: "loading" }
  | { kind: "loaded"; postings: JobPosting[] }
  | { kind: "error" };

export function JobPostingsList() {
  const [state, setState] = useState<ListState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ kind: "loading" });

    listJobPostings()
      .then((postings) => {
        if (active) setState({ kind: "loaded", postings });
      })
      .catch((error: unknown) => {
        if (active) {
          console.error("No se pudieron cargar las vacantes", error);
          setState({ kind: "error" });
        }
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  return (
    <main className="mx-auto min-h-[calc(100vh-7rem)] w-full max-w-7xl bg-[#f6f5f1] px-4 py-8 text-[#111a2e] sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#f97316]">
          Bolsa de trabajo
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Ofertas laborales actuales</h1>
        <p className="mt-2 max-w-2xl text-[#475569]">
          Explora las oportunidades publicadas por las empresas.
        </p>
      </header>

      {state.kind === "loading" && (
        <p role="status" className="rounded-xl border border-[#e2e8f0] bg-white p-8 text-center text-[#475569]">
          Cargando vacantes...
        </p>
      )}

      {state.kind === "error" && (
        <section className="rounded-xl border border-[#e2e8f0] bg-white p-8 text-center">
          <p className="text-lg font-semibold">No pudimos cargar las vacantes</p>
          <p className="mt-2 text-[#475569]">Ocurrió un problema al consultar las ofertas disponibles.</p>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#f97316] px-5 py-3 font-semibold text-white hover:bg-[#ea580c]"
          >
            <RotateCcw aria-hidden="true" size={17} />
            Reintentar
          </button>
        </section>
      )}

      {state.kind === "loaded" && state.postings.length === 0 && (
        <p className="rounded-xl border border-[#e2e8f0] bg-white p-8 text-center text-[#475569]">
          No hay vacantes disponibles en este momento.
        </p>
      )}

      {state.kind === "loaded" && state.postings.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-2">
          {state.postings.map((posting) => (
            <li key={posting.id} className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-[#f97316]">
                {posting.company?.name ?? "Empresa no especificada"}
              </p>
              <h2 className="mt-2 text-xl font-bold">
                {posting.title ?? "Vacante sin título"}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2 text-sm text-[#475569]">
                {posting.modality && (
                  <span className="rounded-md bg-[#f1f5f9] px-2.5 py-1">{posting.modality}</span>
                )}
                {posting.experienceLevel && (
                  <span className="rounded-md bg-[#f1f5f9] px-2.5 py-1">{posting.experienceLevel}</span>
                )}
              </div>
              <p className="mt-4 line-clamp-3 text-sm leading-6 text-[#475569]">
                {posting.technicalDescription ?? "La empresa no registró una descripción."}
              </p>
              <Link
                href={`/job-postings/${encodeURIComponent(posting.id)}`}
                className="mt-5 inline-flex items-center gap-2 font-semibold text-[#1e3a5f] hover:text-[#f97316]"
              >
                Ver detalle
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
            </li>
          ))}
        </ul>
      )}

    </main>
  );
}
