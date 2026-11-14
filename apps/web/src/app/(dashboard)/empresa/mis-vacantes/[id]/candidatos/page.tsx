"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Applicant, APPLICANT_STATUSES, EXPERIENCE_LEVELS } from "@/shared/types/applicant";
import { Vacancy } from "@/shared/types/vacancy";
import {
  getApplicantsByVacancy,
  MATCH_ENGINE_ERROR_MESSAGE,
} from "@/shared/services/applicants";
import { getVacancyById } from "@/shared/services/vacancies";
import { useApplicantFilters } from "@/shared/hooks/useApplicantFilters";
import { MatchSlider } from "@/shared/components/match-slider";
import { VacancyHeader } from "@/shared/components/vacancy-header";
import { StatusBadge } from "@/shared/components/status-badge";
import { clampForDisplay, formatMatch, hasMatch, listBarColor } from "@/shared/utils/match-format";
import { formatDate, getInitials } from "@/shared/utils/format";
import { Cargando, EstadoError, EstadoVacio } from "../../../_components/estado-pantalla";

export default function CandidatesPage() {
  const params = useParams();
  const router = useRouter();
  const PAGE_SIZE = 10;
  const vacancyId = params?.id as string;

  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(false);
      try {
        // Primero la vacante: su fecha de publicación se usa para las fechas de
        // los postulantes de prueba (BUG-05-01). Si falla, solo se oculta su tarjeta.
        const vac = await getVacancyById(vacancyId).catch(() => null);
        const list = await getApplicantsByVacancy(vacancyId, vac?.publishedAt);
        if (!cancelled) {
          setApplicants(list);
          setVacancy(vac);
        }
      } catch {
        // CA-08 / CA-09: no se muestran datos de la petición fallida
        if (!cancelled) {
          setApplicants([]);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [vacancyId, reloadKey]);

  const {
    searchTerm,
    setSearchTerm,
    minMatch,
    setMinMatch,
    selectedStatus,
    setSelectedStatus,
    selectedLevel,
    setSelectedLevel,
    filteredApplicants,
    handleClearFilters,
  } = useApplicantFilters(applicants);
  
  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [searchTerm, minMatch, selectedStatus, selectedLevel, applicants]);

  const totalPages = Math.max(1, Math.ceil(filteredApplicants.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const firstIndex = (currentPage - 1) * PAGE_SIZE;
  const pageApplicants = filteredApplicants.slice(firstIndex, firstIndex + PAGE_SIZE);
  
  return (
    <div className="w-full max-w-[1536px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Encabezado + Volver */}
      <div className="space-y-2">
        <button
          onClick={() => router.push("/empresa/mis-vacantes")}
          className="min-h-11 md:min-h-0 text-sm font-semibold text-[#1B2632] hover:underline flex items-center gap-1"
        >
          ← Volver
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[#1B2632] break-words">Postulantes</h1>
          <p className="text-sm text-gray-500">
            Revisa los postulantes de la vacante y encuentra el mejor talento.
          </p>
        </div>
      </div>

      {vacancy && <VacancyHeader vacancy={vacancy} />}

      {/* CA-08: estado de carga */}
      {loading && <Cargando texto="Cargando candidatos..." />}

      {/* CA-21: error con "Reintentar" */}
      {!loading && error && (
        <EstadoError
          mensaje={MATCH_ENGINE_ERROR_MESSAGE}
          onReintentar={() => setReloadKey((k) => k + 1)}
        />
      )}

      {/* CA-20: la vacante no tiene postulantes */}
      {!loading && !error && applicants.length === 0 && (
        <EstadoVacio mensaje="No existen postulantes para esta vacante." />
      )}

      {!loading && !error && applicants.length > 0 && (
        <>
          {/* Filtros */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#EEE9DF] shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-4 md:gap-6 items-end">
              <div className="min-w-0"><MatchSlider value={minMatch} onChange={setMinMatch} /></div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-[#1B2632]">Estado del postulante</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full min-h-11 md:min-h-0 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFB162]"
                >
                  <option value="Todos">Todos</option>
                  {APPLICANT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-[#1B2632]">Nivel de experiencia</label>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="w-full min-h-11 md:min-h-0 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFB162]"
                >
                  <option value="Todos">Todos</option>
                  {EXPERIENCE_LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <input
                type="text"
                placeholder="Buscar candidato"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:max-w-md min-h-11 md:min-h-0 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFB162]"
              />
              <button
                onClick={handleClearFilters}
                className="w-full sm:w-auto min-h-11 md:min-h-0 px-4 py-2 text-xs font-semibold text-[#1B2632] border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Limpiar filtros
              </button>
            </div>
          </div>

          {/* Tabla de postulantes */}
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium">
                            {filteredApplicants.length === 0
                ? `Mostrando 0 de ${applicants.length} postulantes`
                : `Mostrando ${firstIndex + 1}–${firstIndex + pageApplicants.length} de ${filteredApplicants.length} postulantes`}
            </p>

            {filteredApplicants.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#EEE9DF]">
                <EstadoVacio mensaje="Ningún postulante cumple con los filtros aplicados." />
              </div>
            ) : (
              <>
              {/* CA-03 / CA-12: en móvil cada fila es una tarjeta */}
              <ul className="md:hidden space-y-3">
                {pageApplicants.map((applicant) => (
                  <li
                    key={applicant.id}
                    className="bg-white rounded-xl border border-[#EEE9DF] shadow-sm p-4 space-y-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#EEE9DF] text-[#1B2632] text-xs font-bold flex items-center justify-center shrink-0">
                        {getInitials(applicant.name)}
                      </div>
                      <span className="font-semibold text-[#1B2632] min-w-0 break-words [overflow-wrap:anywhere]">
                        {applicant.name}
                      </span>
                    </div>

                    {hasMatch(applicant.matchPercentage) ? (
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${listBarColor(applicant.matchPercentage)}`}
                            style={{ width: `${clampForDisplay(applicant.matchPercentage)}%` }}
                          />
                        </div>
                        <span className="font-bold text-[#1B2632] w-12 text-right text-sm">
                          {formatMatch(applicant.matchPercentage)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">{formatMatch(null)}</span>
                    )}

                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm text-[#1B2632]">
                      <div className="min-w-0">
                        <dt className="text-xs font-bold text-gray-500">Nivel</dt>
                        <dd className="break-words">{applicant.experienceLevel}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-xs font-bold text-gray-500">Estado</dt>
                        <dd><StatusBadge status={applicant.status} /></dd>
                      </div>
                      <div className="min-w-0 col-span-2">
                        <dt className="text-xs font-bold text-gray-500">Fecha de postulación</dt>
                        <dd>{formatDate(applicant.appliedAt)}</dd>
                      </div>
                    </dl>

                    <Link
                      href={`/empresa/mis-vacantes/${vacancyId}/candidatos/${applicant.id}`}
                      className="flex min-h-11 md:min-h-0 w-full items-center justify-center rounded-lg border border-gray-300 text-sm font-bold text-[#1B2632] hover:bg-gray-50"
                    >
                      Ver detalle
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Escritorio: tabla original sin cambios */}
              <div className="hidden md:block bg-white rounded-xl border border-[#EEE9DF] shadow-sm overflow-x-auto">
                <table className="w-full text-sm text-left">
                  {/* BUG-05-05: encabezados en negrita y color oscuro, como el mockup */}
                  <thead className="text-xs text-[#1B2632] border-b border-[#EEE9DF]">
                    <tr>
                      <th className="px-4 py-3 font-bold">Candidato</th>
                      <th className="px-4 py-3 font-bold">Coincidencia técnica</th>
                      <th className="px-4 py-3 font-bold">Nivel de experiencia</th>
                      <th className="px-4 py-3 font-bold">Estado</th>
                      <th className="px-4 py-3 font-bold">Fecha de postulación</th>
                      <th className="px-4 py-3 font-bold text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageApplicants.map((applicant) => (
                      <tr key={applicant.id} className="border-b border-[#EEE9DF] last:border-0">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 md:w-9 md:h-9 rounded-full bg-[#EEE9DF] text-[#1B2632] text-xs font-bold flex items-center justify-center shrink-0">
                              {getInitials(applicant.name)}
                            </div>
                            <span className="font-semibold text-[#1B2632]">{applicant.name}</span>
                          </div>
                        </td>

                        {/* CA-02 / CA-05 / CA-10: valor recibido o "No disponible" */}
                        <td className="px-4 py-3">
                          {hasMatch(applicant.matchPercentage) ? (
                            <div className="flex items-center gap-3 min-w-[170px]">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${listBarColor(applicant.matchPercentage)}`}
                                  style={{ width: `${clampForDisplay(applicant.matchPercentage)}%` }}
                                />
                              </div>
                              <span className="font-bold text-[#1B2632] w-10 text-right">
                                {formatMatch(applicant.matchPercentage)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-500">{formatMatch(null)}</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-[#1B2632]">{applicant.experienceLevel ?? "No registrado"}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={applicant.status} />
                        </td>
                        <td className="px-4 py-3 text-[#1B2632]">{formatDate(applicant.appliedAt)}</td>

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            {/* Ver detalle -> segunda página */}
                            <Link
                              href={`/empresa/mis-vacantes/${vacancyId}/candidatos/${applicant.id}`}
                              aria-label={`Ver detalle de ${applicant.name}`}
                              title="Ver detalle"
                              className="p-1.5 rounded-md text-[#1B2632] hover:bg-gray-100"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="w-5 h-5"
                                aria-hidden="true"
                              >
                                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </Link>
                            <button
                              disabled
                              title="Más acciones (próximamente)"
                              aria-label="Más acciones"
                              className="px-2 py-1 rounded-md bg-gray-100 text-gray-400 cursor-not-allowed text-xs font-bold"
                            >
                              ···
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
            {totalPages > 1 && (
              <nav className="flex flex-wrap items-center justify-center gap-1 pt-2" aria-label="Paginación de postulantes">
                <button
                  type="button"
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Página anterior"
                  className="w-10 h-10 md:w-9 md:h-9 rounded-md border border-[#EEE9DF] bg-white text-[#1B2632] font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    aria-label={`Página ${n}`}
                    aria-current={n === currentPage ? "page" : undefined}
                    className={`w-10 h-10 md:w-9 md:h-9 rounded-md text-sm font-semibold border ${
                      n === currentPage
                        ? "bg-[#1B2632] text-white border-[#1B2632]"
                        : "bg-white text-[#1B2632] border-[#EEE9DF] hover:bg-gray-50"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="Página siguiente"
                  className="w-10 h-10 md:w-9 md:h-9 rounded-md border border-[#EEE9DF] bg-white text-[#1B2632] font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  ›
                </button>
              </nav>
            )}
          </div>
        </>
      )}
    </div>
  );
}