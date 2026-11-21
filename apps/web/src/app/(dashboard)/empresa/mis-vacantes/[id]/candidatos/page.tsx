"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Applicant, APPLICANT_STATUSES, ApplicantStatus } from "@/shared/types/applicant";
import { Vacancy } from "@/shared/types/vacancy";
import {
  getApplicantsByVacancy,
  AFFINITY_UNAVAILABLE_MESSAGE,
  MATCH_ENGINE_ERROR_MESSAGE,
  updateApplicantStage,
} from "@/shared/services/applicants";
import { getVacancyById } from "@/shared/services/vacancies";
import { useApplicantFilters } from "@/shared/hooks/useApplicantFilters";
import { MatchSlider } from "@/shared/components/match-slider";
import { VacancyHeader } from "@/shared/components/vacancy-header";
import { clampForDisplay, formatMatch, hasMatch, listBarColor } from "@/shared/utils/match-format";
import { formatDate, getInitials } from "@/shared/utils/format";

// --- CA-14: Colores por etapa (una sola fuente para la etiqueta y el menú) ---
const STAGE_STYLES: Record<ApplicantStatus, { pill: string; dot: string }> = {
  Postulado: { pill: "bg-gray-100 text-gray-700 border border-gray-200", dot: "bg-gray-500" },
  "En revisión": { pill: "bg-orange-100 text-orange-700 border border-orange-200", dot: "bg-orange-500" },
  Preseleccionado: { pill: "bg-blue-100 text-blue-700 border border-blue-200", dot: "bg-blue-500" },
  Entrevista: { pill: "bg-green-100 text-green-700 border border-green-200", dot: "bg-green-500" },
  Descartado: { pill: "bg-red-100 text-red-700 border border-red-200", dot: "bg-red-500" },
};

interface StageSelectorProps {
  applicant: Applicant;
  isOpen: boolean;
  isUpdating: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSelect: (stage: ApplicantStatus) => void;
}

/** HU-04: etiqueta de etapa con el menú «Cambiar etapa» (tabla y tarjetas móviles). */
function StageSelector({ applicant, isOpen, isUpdating, onToggle, onClose, onSelect }: StageSelectorProps) {
  const current = STAGE_STYLES[applicant.status];
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={onToggle}
        disabled={isUpdating}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Etapa de ${applicant.name}: ${applicant.status}. Cambiar etapa`}
        className={`px-3 py-1.5 text-xs font-semibold rounded-full flex items-center justify-between gap-2 min-w-[140px] ${current.pill} ${isUpdating ? "opacity-50 cursor-wait" : "hover:opacity-80"}`}
      >
        {isUpdating ? "Guardando..." : applicant.status}
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={onClose} aria-hidden="true" />
          <div role="menu" className="absolute top-full left-0 mt-2 w-60 bg-white border border-[#EEE9DF] rounded-xl shadow-xl z-20 p-2">
            <p className="px-2 pt-1 pb-2 text-xs font-bold text-[#1B2632] border-b border-[#EEE9DF] mb-1">Cambiar etapa</p>
            {APPLICANT_STATUSES.map((stage) => {
              const isCurrent = applicant.status === stage;
              return (
                <button
                  key={stage}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isCurrent}
                  onClick={() => (isCurrent ? onClose() : onSelect(stage))}
                  className={`w-full flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm text-left ${isCurrent ? "bg-[#F7F4EE] font-semibold text-[#1B2632]" : "text-gray-700 hover:bg-gray-50"}`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${STAGE_STYLES[stage].dot}`} aria-hidden="true" />
                    {stage}
                  </span>
                  {isCurrent && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-green-700">
                      Actual
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function CandidatesPage() {
  const params = useParams();
  const router = useRouter();
  const PAGE_SIZE = 10;
  const vacancyId = params?.id as string;

  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // --- Estados para el menú y modales (HU-04) ---
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmDiscardId, setConfirmDiscardId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (reloadKey === 0) setLoading(true);
      else setRefreshing(true);
      setError(false);
      try {
        const vac = await getVacancyById(vacancyId).catch(() => null);
        const list = await getApplicantsByVacancy(vacancyId, vac?.publishedAt);
        if (!cancelled) {
          setApplicants(list);
          setVacancy(vac);
        }
      } catch {
        if (!cancelled) {
          setApplicants([]);
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [vacancyId, reloadKey]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (document.visibilityState === 'hidden') return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setReloadKey((key) => key + 1), 500);
    };
    const interval = setInterval(schedule, 30_000);
    window.addEventListener('focus', schedule);
    document.addEventListener('visibilitychange', schedule);
    return () => {
      clearInterval(interval);
      if (timer) clearTimeout(timer);
      window.removeEventListener('focus', schedule);
      document.removeEventListener('visibilitychange', schedule);
    };
  }, []);

  const {
    searchTerm, setSearchTerm, minMatch, setMinMatch,
    selectedStatus, setSelectedStatus,
    filteredApplicants, handleClearFilters,
  } = useApplicantFilters(applicants);
  
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [searchTerm, minMatch, selectedStatus, applicants]);

  const totalPages = Math.max(1, Math.ceil(filteredApplicants.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const firstIndex = (currentPage - 1) * PAGE_SIZE;
  const pageApplicants = filteredApplicants.slice(firstIndex, firstIndex + PAGE_SIZE);

  // --- CA-02 y CA-16: Lógica para guardar la etapa ---
  const handleUpdateStage = async (applicantId: string, newStage: ApplicantStatus, applicantName: string) => {
    if (newStage === "Descartado") {
      setConfirmDiscardId(applicantId);
      setOpenMenuId(null);
      return;
    }
    await saveStage(applicantId, newStage, applicantName);
  };

  const saveStage = async (applicantId: string, newStage: ApplicantStatus, applicantName: string) => {
    setUpdatingId(applicantId);
    setOpenMenuId(null);
    setConfirmDiscardId(null);

    try {
      await updateApplicantStage(vacancyId, applicantId, newStage);
      setApplicants((prev) =>
        prev.map((app) => (app.id === applicantId ? { ...app, status: newStage } : app))
      );
      showToast("success", `Etapa actualizada: ${applicantName} pasó a ${newStage}`);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "No se pudo guardar la etapa. Intenta de nuevo.");
    } finally {
      setUpdatingId(null);
    }
  };

  const stageSelector = (applicant: Applicant) => (
    <StageSelector
      applicant={applicant}
      isOpen={openMenuId === applicant.id}
      isUpdating={updatingId === applicant.id}
      onToggle={() => setOpenMenuId(openMenuId === applicant.id ? null : applicant.id)}
      onClose={() => setOpenMenuId(null)}
      onSelect={(stage) => handleUpdateStage(applicant.id, stage, applicant.name)}
    />
  );

  return (
    <div className="w-full max-w-[1536px] mx-auto px-4 sm:px-6 py-6 space-y-6 relative">
      
      {toast && (
        <div
          role={toast.type === "error" ? "alert" : "status"}
          className={`fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 text-white px-6 py-3 rounded-lg shadow-lg z-50 ${toast.type === "error" ? "bg-red-600" : "bg-green-600"}`}
        >
          {toast.message}
        </div>
      )}

      <div className="space-y-2">
        <button onClick={() => router.push("/empresa/mis-vacantes")} className="text-sm font-semibold text-[#1B2632] hover:underline flex items-center gap-1">
          ← Volver
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[#1B2632]">Postulantes</h1>
          <p className="text-sm text-gray-500">Revisa los postulantes de la vacante y encuentra el mejor talento.</p>
        </div>
      </div>

      {vacancy && <VacancyHeader vacancy={vacancy} />}
      {refreshing && <p role="status" className="text-sm text-[#1B2632]">Actualizando afinidades…</p>}

      {loading && <div className="p-8 text-center text-[#1B2632] font-medium" role="status">Cargando candidatos...</div>}

      {!loading && error && (
        <div className="p-8 max-w-xl mx-auto text-center space-y-4" role="alert">
          <p className="text-[#A35139] font-semibold">{MATCH_ENGINE_ERROR_MESSAGE}</p>
          <button onClick={() => setReloadKey((k) => k + 1)} className="px-4 py-2 text-xs font-bold text-white bg-[#1B2632] rounded-lg hover:bg-opacity-90">
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && applicants.length === 0 && (
        <div className="p-8 text-center text-gray-500">No existen postulantes para esta vacante.</div>
      )}

      {!loading && !error && applicants.length > 0 && (
        <>
          <div className="bg-white p-5 rounded-xl border border-[#EEE9DF] shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-6 items-end">
              <MatchSlider value={minMatch} onChange={setMinMatch} />
              <div className="space-y-1">
                <label className="text-sm font-medium text-[#1B2632]">Estado del postulante</label>
                <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFB162]">
                  <option value="Todos">Todos</option>
                  {APPLICANT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <input type="text" placeholder="Buscar candidato" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:max-w-md px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFB162]" />
              <button onClick={handleClearFilters} className="px-4 py-2 text-xs font-semibold text-[#1B2632] border border-gray-300 rounded-lg hover:bg-gray-50">Limpiar filtros</button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium">
              {filteredApplicants.length === 0
                ? `Mostrando 0 de ${applicants.length} postulantes`
                : `Mostrando ${firstIndex + 1}–${firstIndex + pageApplicants.length} de ${filteredApplicants.length} postulantes`}
            </p>

            {applicants.some((applicant) => applicant.matchError === AFFINITY_UNAVAILABLE_MESSAGE) && (
              <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {AFFINITY_UNAVAILABLE_MESSAGE}
              </p>
            )}

            {filteredApplicants.length === 0 ? (
              <div className="bg-white p-8 rounded-xl text-center border border-[#EEE9DF] text-gray-500">Ningún postulante cumple con los filtros aplicados.</div>
            ) : (
              <>
              {/* HU-03 (CA-03 / CA-12): en móvil cada postulante es una tarjeta */}
              <ul className="md:hidden space-y-3">
                {pageApplicants.map((applicant) => (
                  <li key={applicant.id} className="bg-white rounded-xl border border-[#EEE9DF] shadow-sm p-4 space-y-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#EEE9DF] text-[#1B2632] text-xs font-bold flex items-center justify-center shrink-0">
                        {getInitials(applicant.name)}
                      </div>
                      <span className="font-semibold text-[#1B2632] min-w-0 break-words [overflow-wrap:anywhere]">{applicant.name}</span>
                    </div>

                    {hasMatch(applicant.matchPercentage) ? (
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${listBarColor(applicant.matchPercentage)}`} style={{ width: `${clampForDisplay(applicant.matchPercentage)}%` }} />
                        </div>
                        <span className="font-bold text-[#1B2632] w-12 text-right text-sm">{formatMatch(applicant.matchPercentage)}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Coincidencia técnica: {formatMatch(null)}</span>
                    )}

                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm text-[#1B2632]">
                      <div className="min-w-0 col-span-2">
                        <dt className="text-xs font-bold text-gray-500">Fecha de postulación</dt>
                        <dd>{formatDate(applicant.appliedAt)}</dd>
                      </div>
                      <div className="min-w-0 col-span-2">
                        <dt className="text-xs font-bold text-gray-500 mb-1">Etapa de selección</dt>
                        <dd>{stageSelector(applicant)}</dd>
                      </div>
                    </dl>

                    <Link
                      href={`/empresa/mis-vacantes/${vacancyId}/candidatos/${applicant.id}`}
                      className="flex min-h-11 w-full items-center justify-center rounded-lg border border-gray-300 text-sm font-bold text-[#1B2632] hover:bg-gray-50"
                    >
                      Ver detalle
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Escritorio: tabla (overflow visible para que el menú de etapa no se corte) */}
              <div className="hidden md:block bg-white rounded-xl border border-[#EEE9DF] shadow-sm overflow-visible">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-[#1B2632] border-b border-[#EEE9DF]">
                    <tr>
                      <th className="px-4 py-3 font-bold">Candidato</th>
                      <th className="px-4 py-3 font-bold">Coincidencia técnica</th>
                      <th className="px-4 py-3 font-bold">Etapa de selección</th>
                      <th className="px-4 py-3 font-bold">Fecha de postulación</th>
                      <th className="px-4 py-3 font-bold text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageApplicants.map((applicant) => (
                      <tr key={applicant.id} className="border-b border-[#EEE9DF] last:border-0">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#EEE9DF] text-[#1B2632] text-xs font-bold flex items-center justify-center shrink-0">
                              {getInitials(applicant.name)}
                            </div>
                            <span className="font-semibold text-[#1B2632]">{applicant.name}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          {refreshing ? (
                            <span className="text-gray-500" role="status">Actualizando…</span>
                          ) : hasMatch(applicant.matchPercentage) ? (
                            <div className="flex items-center gap-3 min-w-[170px]">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${listBarColor(applicant.matchPercentage)}`} style={{ width: `${clampForDisplay(applicant.matchPercentage)}%` }} />
                              </div>
                              <span className="font-bold text-[#1B2632] w-10 text-right">{formatMatch(applicant.matchPercentage)}</span>
                            </div>
                          ) : (
                            <span className="text-gray-500" role="status">{applicant.matchStatus === 'profile-incomplete'
                              ? 'Perfil incompleto'
                              : applicant.matchStatus === 'no-requirements'
                                ? 'Sin requisitos'
                                : applicant.matchStatus === 'error'
                                  ? 'Error de afinidad; se reintentará'
                                  : applicant.matchStatus === 'pending'
                                    ? 'Actualización pendiente'
                                    : formatMatch(null)}</span>
                          )}
                        </td>

                        <td className="px-4 py-3">{stageSelector(applicant)}</td>

                        <td className="px-4 py-3 text-[#1B2632]">{formatDate(applicant.appliedAt)}</td>

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <Link href={`/empresa/mis-vacantes/${vacancyId}/candidatos/${applicant.id}`} aria-label={`Ver detalle de ${applicant.name}`} title="Ver detalle" className="p-1.5 rounded-md text-[#1B2632] hover:bg-gray-100">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
                            </Link>
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
              <nav className="flex items-center justify-center gap-1 pt-2" aria-label="Paginación de postulantes">
                <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1} aria-label="Página anterior" className="w-9 h-9 rounded-md border border-[#EEE9DF] bg-white text-[#1B2632] font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50">‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button key={n} type="button" onClick={() => setPage(n)} aria-label={`Página ${n}`} aria-current={n === currentPage ? "page" : undefined} className={`w-9 h-9 rounded-md text-sm font-semibold border ${n === currentPage ? "bg-[#1B2632] text-white border-[#1B2632]" : "bg-white text-[#1B2632] border-[#EEE9DF] hover:bg-gray-50"}`}>{n}</button>
                ))}
                <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage === totalPages} aria-label="Página siguiente" className="w-9 h-9 rounded-md border border-[#EEE9DF] bg-white text-[#1B2632] font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50">›</button>
              </nav>
            )}
          </div>
        </>
      )}

      {confirmDiscardId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
              <h2 className="text-xl font-bold text-[#1B2632]">¿Descartar postulante?</h2>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              El postulante pasará a la etapa <strong>Descartado</strong> y no podrá avanzar en el proceso.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDiscardId(null)} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button 
                onClick={() => {
                  const app = applicants.find(a => a.id === confirmDiscardId);
                  if (app) saveStage(app.id, "Descartado", app.name);
                }} 
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
