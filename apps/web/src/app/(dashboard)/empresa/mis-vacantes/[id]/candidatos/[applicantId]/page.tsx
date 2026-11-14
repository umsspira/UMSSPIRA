"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Applicant } from "@/shared/types/applicant";
import { Vacancy } from "@/shared/types/vacancy";
import {
  getApplicantById,
  MATCH_ENGINE_ERROR_MESSAGE,
} from "@/shared/services/applicants";
import { getVacancyById } from "@/shared/services/vacancies";
import { VacancyHeader } from "@/shared/components/vacancy-header";
import { MatchBreakdownView } from "@/shared/components/match-breakdown-view";

const STAGES = ["Postulado", "En revisión", "Preseleccionado", "Entrevista", "Descartado"];

// Colores de la línea de tiempo
const getStageColor = (stage: string) => {
  switch (stage) {
    case "Postulado": return "bg-gray-400 text-gray-500";
    case "En revisión": return "bg-orange-400 text-orange-500";
    case "Preseleccionado": return "bg-blue-400 text-blue-500";
    case "Entrevista": return "bg-green-500 text-green-600";
    case "Descartado": return "bg-red-500 text-red-600";
    default: return "bg-gray-300 text-gray-400";
  }
};

export default function ApplicantMatchPage() {
  const params = useParams();
  const router = useRouter();
  const vacancyId = params?.id as string;
  const applicantId = params?.applicantId as string;

  const [applicant, setApplicant] = useState<Applicant | null>(null);
  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Estados para la línea de tiempo y el cambio de etapa
  const [selectedStage, setSelectedStage] = useState<string>("");
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const goBackToList = () => router.push(`/empresa/mis-vacantes/${vacancyId}/candidatos`);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(false);
      try {
        const vac = await getVacancyById(vacancyId).catch(() => null);
        const data = await getApplicantById(vacancyId, applicantId, vac?.publishedAt);
        if (!cancelled) {
          setApplicant(data);
          setVacancy(vac);
          if (data) setSelectedStage(data.status); // Iniciar el select con la etapa actual
        }
      } catch {
        if (!cancelled) {
          setApplicant(null);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [vacancyId, applicantId, reloadKey]);

  // Agregamos el traductor para que el backend entienda el código
  const STAGE_CODES: Record<string, string> = {
    "Postulado": "postulado",
    "En revisión": "en_revision",
    "Preseleccionado": "preseleccionado",
    "Entrevista": "entrevista",
    "Descartado": "descartado",
  };

  const handleSaveStage = async () => {
    if (!applicant || selectedStage === applicant.status) return;

    if (selectedStage === "Descartado") {
      setIsDiscardModalOpen(true);
      return;
    }

    await saveStage(selectedStage);
  };

  const saveStage = async (newStage: string) => {
    if (!applicant) return;
    setIsSaving(true);
    setIsDiscardModalOpen(false);

    try {
      const res = await fetch(`/api/v1/vacantes/${vacancyId}/postulantes/${applicantId}/etapa`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // 👇 AQUÍ ESTÁ EL CAMBIO: Enviamos "etapa" con el código en minúsculas
        body: JSON.stringify({ etapa: STAGE_CODES[newStage] }),
      });

      if (!res.ok) throw new Error("Error al actualizar");

      // Actualizamos el estado local
      setApplicant((prev) => prev ? { ...prev, status: newStage as any } : prev);
      
      // Mostrar el mensaje de éxito (CA-02)
      setToastMessage(`Etapa actualizada: ${applicant.name} pasó a ${newStage}`);
      setTimeout(() => setToastMessage(null), 4000);

    } catch (err) {
      alert("Hubo un error al guardar la etapa. Intenta de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-[1536px] mx-auto px-4 sm:px-6 py-6 space-y-6 relative">
      
      {/* Cartel de éxito */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-bottom-4">
          {toastMessage}
        </div>
      )}

      <div className="space-y-2">
        <button onClick={goBackToList} className="text-sm font-semibold text-[#1B2632] hover:underline flex items-center gap-1">
          ← Volver a postulantes
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[#1B2632]">Detalle del postulante</h1>
          {vacancy && <p className="text-sm text-gray-500">{vacancy.title} · Publicado el {vacancy.publishedAt ? new Date(vacancy.publishedAt).toLocaleDateString() : '—'}</p>}
        </div>
      </div>

      {loading && <div className="p-8 text-center text-[#1B2632] font-medium" role="status">Cargando candidato...</div>}

      {!loading && error && (
        <div className="p-8 max-w-xl mx-auto text-center space-y-4" role="alert">
          <p className="text-[#A35139] font-semibold">{MATCH_ENGINE_ERROR_MESSAGE}</p>
          <button onClick={() => setReloadKey((k) => k + 1)} className="px-4 py-2 text-xs font-bold text-white bg-[#1B2632] rounded-lg">Reintentar</button>
        </div>
      )}

      {!loading && !error && !applicant && (
        <div className="p-8 text-center space-y-4">
          <p className="text-gray-500">No se encontró al postulante.</p>
          <button onClick={goBackToList} className="px-4 py-2 text-xs font-bold text-[#1B2632] border rounded-lg">Volver a la lista</button>
        </div>
      )}

      {!loading && !error && applicant && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Izquierda: Desglose del Candidato (Lo que ya tenías) */}
          <div className="lg:col-span-2 space-y-4">
            <MatchBreakdownView applicant={applicant} onBack={goBackToList} />
          </div>

          {/* Columna Derecha: Etapas de Selección (El nuevo diseño) */}
          <div className="bg-white p-6 rounded-xl border border-[#EEE9DF] shadow-sm h-fit">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-[#1B2632]">Etapa de selección</h2>
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${getStageColor(applicant.status).split(' ')[0].replace('bg-', 'bg-').concat(' text-white')}`}>
                {applicant.status}
              </span>
            </div>

            {/* Línea de tiempo vertical */}
            <div className="relative pl-6 space-y-6 before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent mb-8">
              {STAGES.map((stage, index) => {
                const isCurrent = applicant.status === stage;
                const isPast = STAGES.indexOf(applicant.status) > index;
                const isNext = STAGES.indexOf(applicant.status) + 1 === index;
                const color = getStageColor(stage);

                return (
                  <div key={stage} className="relative flex items-start gap-4">
                    {/* Círculo indicador */}
                    <div className={`absolute -left-6 mt-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center z-10 ${isCurrent || isPast ? color.split(' ')[0] : 'bg-gray-200'}`}>
                      {isCurrent && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                    
                    <div className="flex flex-col">
                      <span className={`text-sm font-semibold ${isCurrent ? color.split(' ')[1] : 'text-gray-500'}`}>
                        {stage}
                      </span>
                      {isCurrent && <span className="text-xs text-gray-400 mt-0.5">Hoy, {new Date().toLocaleDateString()}</span>}
                      {isNext && <span className="text-xs text-gray-400 mt-0.5">Siguiente etapa</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Formulario para cambiar de etapa */}
            <div className="space-y-4 pt-4 border-t border-[#EEE9DF]">
              <div className="space-y-1">
                <label className="text-sm font-medium text-[#1B2632]">Mover a</label>
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFB162]"
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveStage}
                  disabled={isSaving || selectedStage === applicant.status}
                  className="flex-1 py-2 text-sm font-semibold text-white bg-[#FF8A00] rounded-lg hover:bg-[#e67c00] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Guardando...' : 'Guardar etapa'}
                </button>
                <button
                  onClick={() => {
                    setSelectedStage("Descartado");
                    setIsDiscardModalOpen(true);
                  }}
                  className="flex-1 py-2 text-sm font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                >
                  Descartar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación al descartar (CA-08) */}
      {isDiscardModalOpen && (
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
              <button onClick={() => setIsDiscardModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={() => saveStage("Descartado")} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700">
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}