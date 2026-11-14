"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, RefreshCw, RotateCcw } from "lucide-react";
import {
  listJobPostings,
  type JobPosting,
} from "@/shared/services/job-postings";

type ListState =
  | { kind: "loading" }
  | { kind: "loaded"; postings: JobPosting[] }
  | { kind: "error" };

export function JobPostingsList({ isGraduate }: { isGraduate: boolean }) {
  const [state, setState] = useState<ListState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [term, setTerm] = useState("");
  const [query, setQuery] = useState({ search: "", page: 1 });
  const { search, page } = query;

  useEffect(() => {
    let active = true;
    setState({ kind: "loading" });

    const request = search
      ? listJobPostings({ search, page })
      : listJobPostings();
    request
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
  }, [attempt, search, page]);

  return (
    <section
      aria-label="Listado real de vacantes"
      className="w-full py-8 text-[#111a2e]"
    >
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#f97316]">
            Bolsa de trabajo
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Ofertas laborales actuales
          </h1>
          <p className="mt-2 max-w-2xl text-[#475569]">
            Explora las oportunidades publicadas por las empresas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAttempt((value) => value + 1)}
          disabled={state.kind === "loading"}
          className="inline-flex items-center gap-2 rounded-lg border border-[#d9d2c5] bg-white px-4 py-2 text-sm font-semibold text-[#183c56] hover:bg-[#f1ede5] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw aria-hidden="true" size={16} />
          Actualizar lista
        </button>
      </header>

      <form
        role="search"
        className="mb-6 flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setQuery({ search: term.trim(), page: 1 });
          setAttempt((value) => value + 1);
        }}
      >
        <label className="flex min-w-64 flex-1 flex-col gap-2 text-sm font-semibold">
          Buscar por título o empresa
          <input
            type="search"
            value={term}
            maxLength={200}
            onChange={(event) => setTerm(event.target.value)}
            className="rounded-lg border border-[#d9d2c5] bg-white px-3 py-2 font-normal"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-[#f97316] px-4 py-2 font-semibold text-white"
        >
          Buscar
        </button>
        {query.search && (
          <button
            type="button"
            onClick={() => {
              setTerm("");
              setQuery({ search: "", page: 1 });
              setAttempt((value) => value + 1);
            }}
            className="rounded-lg border border-[#d9d2c5] bg-white px-4 py-2 font-semibold"
          >
            Limpiar búsqueda
          </button>
        )}
      </form>

      {state.kind === "loading" && (
        <p
          role="status"
          className="rounded-xl border border-[#e2e8f0] bg-white p-8 text-center text-[#475569]"
        >
          Cargando vacantes...
        </p>
      )}

      {state.kind === "error" && (
        <section className="rounded-xl border border-[#e2e8f0] bg-white p-8 text-center">
          <p className="text-lg font-semibold">
            No pudimos cargar las vacantes
          </p>
          <p className="mt-2 text-[#475569]">
            Ocurrió un problema al consultar las ofertas disponibles.
          </p>
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
          {query.search
            ? "No se encontraron vacantes en esta página."
            : "No hay vacantes disponibles en este momento."}
        </p>
      )}

      {state.kind === "loaded" && state.postings.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-2">
          {state.postings.map((posting) => (
            <li
              key={posting.id}
              className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm"
            >
              <p className="text-sm font-semibold text-[#f97316]">
                {posting.company?.name ?? "Empresa no especificada"}
              </p>
              <h2 className="mt-2 text-xl font-bold">
                {posting.title ?? "Vacante sin título"}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2 text-sm text-[#475569]">
                {posting.modality && (
                  <span className="rounded-md bg-[#f1f5f9] px-2.5 py-1">
                    {posting.modality}
                  </span>
                )}
                {posting.experienceLevel && (
                  <span className="rounded-md bg-[#f1f5f9] px-2.5 py-1">
                    {posting.experienceLevel}
                  </span>
                )}
              </div>
              {isGraduate && (
                <section
                  className="mt-4 rounded-lg border border-[#e7e0d4] bg-[#fbfaf7] p-4"
                  aria-label={`Afinidad con tu perfil: ${posting.title ?? "vacante"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[#183c56]">
                      Afinidad con tu perfil
                    </p>
                    {posting.affinityPercentage === null ? (
                      <span className="rounded-full bg-[#f1ede5] px-2.5 py-1 text-xs font-semibold text-[#6b7280]">
                        No disponible
                      </span>
                    ) : (
                      <span className="text-lg font-bold text-[#183c56]">
                        {new Intl.NumberFormat("es-BO", {
                          maximumFractionDigits: 2,
                        }).format(posting.affinityPercentage)}{" "}
                        %
                      </span>
                    )}
                  </div>
                  {posting.affinityPercentage === null ? (
                    <p className="mt-2 text-sm text-[#6b7280]">
                      Afinidad no calculada para esta vacante.
                    </p>
                  ) : (
                    <div
                      className="mt-3 h-2 overflow-hidden rounded-full bg-[#e7e0d4]"
                      role="progressbar"
                      aria-label={`Afinidad para ${posting.title ?? "vacante"}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={posting.affinityPercentage}
                      aria-valuetext={`${posting.affinityPercentage} %`}
                    >
                      <div
                        className="h-full rounded-full bg-[#ed9635] transition-[width]"
                        style={{ width: `${posting.affinityPercentage}%` }}
                      />
                    </div>
                  )}
                </section>
              )}
              <p className="mt-4 line-clamp-3 text-sm leading-6 text-[#475569]">
                {posting.technicalDescription ??
                  "La empresa no registró una descripción."}
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

      {query.search && (
        <nav
          aria-label="Paginación de vacantes"
          className="mt-6 flex items-center justify-center gap-4"
        >
          <button
            type="button"
            disabled={state.kind === "loading" || query.page === 1}
            onClick={() =>
              setQuery((value) => ({ ...value, page: value.page - 1 }))
            }
            className="rounded-lg border border-[#d9d2c5] bg-white px-4 py-2 disabled:opacity-50"
          >
            Anterior
          </button>
          <span>Página {query.page}</span>
          {/* Una página corta o vacía tras validar Prisma no demuestra el fin de los candidatos. */}
          <button
            type="button"
            disabled={state.kind !== "loaded" || query.page >= 1000}
            onClick={() =>
              setQuery((value) => ({ ...value, page: value.page + 1 }))
            }
            className="rounded-lg border border-[#d9d2c5] bg-white px-4 py-2 disabled:opacity-50"
          >
            Siguiente
          </button>
        </nav>
      )}
    </section>
  );
}
