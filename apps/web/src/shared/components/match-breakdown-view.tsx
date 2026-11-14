"use client";

import { useState } from "react";
import { Applicant } from "../types/applicant";
import {
  MATCH_UNAVAILABLE_LABEL,
  clampForDisplay,
  formatMatch,
  getMatchLevel,
  hasMatch,
  skillBarColor,
} from "../utils/match-format";
import { formatDate, getInitials } from "../utils/format";

type Tab = "perfil" | "coincidencia" | "cv" | "historial";

const TABS: { id: Tab; label: string }[] = [
  { id: "perfil", label: "Perfil" },
  { id: "coincidencia", label: "Coincidencia técnica" },
  { id: "cv", label: "CV" },
  { id: "historial", label: "Historial" },
];

/* Íconos de los botones (como en el mockup) */
function DownloadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M9 15 15 9" />
      <path d="M10 9h5v5" />
    </svg>
  );
}

export function MatchBreakdownView({
  applicant,
  onBack,
}: {
  applicant: Applicant;
  onBack?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("coincidencia");

  const matchAvailable = hasMatch(applicant.matchPercentage);
  const level = getMatchLevel(applicant.matchPercentage);
  const skills = applicant.skills ?? [];

  return (
    <div className="space-y-6">
      {/* BUG-06: barra Volver / botones y recuadro del postulante, con la separación del mockup */}
      <div className="space-y-4">
        {/* Barra superior: Volver + acciones */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {onBack ? (
            <button
              onClick={onBack}
              className="min-h-11 md:min-h-0 text-sm font-semibold text-[#1B2632] hover:underline flex items-center gap-1"
            >
              ← Volver
            </button>
          ) : (
            <span />
          )}

          <div className="flex w-full flex-col items-stretch gap-3 md:w-auto md:flex-row md:items-start">
            {/* Texto azul como el mockup (desactivado si no hay CV) */}
            {applicant.cvUrl ? (
              <a
                href={applicant.cvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-11 md:min-h-0 justify-center px-5 py-2.5 text-sm font-bold text-blue-700 bg-white border border-[#EEE9DF] rounded-lg hover:bg-gray-50 inline-flex items-center gap-2"
              >
                <DownloadIcon />
                Descargar CV
              </a>
            ) : (
              <div className="flex flex-col items-stretch gap-1 md:items-start">
                <button
                  disabled
                  aria-describedby="cv-no-disponible"
                  title="El postulante aún no subió su CV"
                  className="min-h-11 md:min-h-0 justify-center px-5 py-2.5 text-sm font-bold text-gray-400 bg-gray-100 border border-gray-200 rounded-lg cursor-not-allowed inline-flex items-center gap-2"
                >
                  <DownloadIcon />
                  Descargar CV
                </button>
                <p id="cv-no-disponible" className="text-xs text-gray-500 text-center md:text-left">
                  El postulante aún no subió su CV
                </p>
              </div>
            )}
            <a
              href={`mailto:${applicant.email}`}
              className="min-h-11 md:min-h-0 justify-center px-5 py-2.5 text-sm font-bold text-white bg-orange-500 rounded-lg hover:bg-orange-600 inline-flex items-center gap-2"
            >
              <SendIcon />
              Contactar
            </a>
          </div>
        </div>

        {/* Cabecera del candidato */}
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-[#EEE9DF] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#EEE9DF] text-[#1B2632] font-bold flex items-center justify-center text-xl shrink-0">
              {getInitials(applicant.name)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-[#1B2632] break-words [overflow-wrap:anywhere]">{applicant.name}</h2>
                {applicant.experienceLevel && (
                  <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                    {applicant.experienceLevel}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 break-all">{applicant.email}</p>
              <p className="text-sm text-gray-500">{applicant.location ?? "Ubicación no registrada"}</p>
              {/* CA-15: en móvil la fecha de postulación se ve sin cambiar de pestaña */}
              <p className="text-sm text-gray-500 md:hidden">Postulado el {formatDate(applicant.appliedAt)}</p>
            </div>
          </div>

          <div
            className={`px-4 py-2 rounded-xl border ${
              matchAvailable ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"
            }`}
          >
            <span
              className={`text-lg font-bold ${matchAvailable ? "text-emerald-700" : "text-gray-500"}`}
            >
              {formatMatch(applicant.matchPercentage)}
            </span>
            <p className="text-[11px] text-gray-500 font-medium">Coincidencia técnica</p>
          </div>
        </div>
      </div>

      {/* Pestañas */}
      <div className="flex border-b border-[#EEE9DF]" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-h-11 md:min-h-0 px-2 md:px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-gray-500 hover:text-[#1B2632]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Pestaña: Perfil */}
      {activeTab === "perfil" && (
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-[#EEE9DF] grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-[#1B2632]">
          <div>
            <p className="text-xs text-gray-500">Correo</p>
            <p className="font-medium break-all">{applicant.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Ubicación</p>
            <p className="font-medium">{applicant.location ?? "No registrada"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Nivel de experiencia</p>
            <p className="font-medium">{applicant.experienceLevel ?? "No registrado"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Estado</p>
            <p className="font-medium">{applicant.status}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Fecha de postulación</p>
            <p className="font-medium">{formatDate(applicant.appliedAt)}</p>
          </div>
        </div>
      )}

      {/* Pestaña: Coincidencia técnica (CA-03, CA-04) */}
      {activeTab === "coincidencia" && (
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-[#EEE9DF] space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Dona con el porcentaje general recibido */}
            <div className="flex flex-col items-center justify-center p-2 md:p-6">
              <h3 className="text-sm font-bold text-[#1B2632] mb-4">
                Resultado de coincidencia técnica
              </h3>
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-200"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {matchAvailable && (
                    <path
                      className="text-emerald-500"
                      strokeDasharray={`${clampForDisplay(applicant.matchPercentage as number)}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  )}
                </svg>
                <div className="absolute flex flex-col items-center text-center px-4">
                  <span
                    className={`font-bold ${
                      matchAvailable ? "text-3xl text-[#1B2632]" : "text-sm text-gray-500"
                    }`}
                  >
                    {formatMatch(applicant.matchPercentage)}
                  </span>
                  {level && (
                    <>
                      <span className="text-[11px] text-gray-500">Coincidencia técnica</span>
                      <span className="text-[11px] font-semibold text-emerald-600">{level}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Desglose por habilidad (valores tal cual los envía la API) */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[#1B2632] mb-2">Desglose por habilidades</h3>
              {skills.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Desglose por habilidades: {MATCH_UNAVAILABLE_LABEL.toLowerCase()}.
                </p>
              ) : (
                skills.map((s) => (
                  <div key={s.skill} className="grid grid-cols-[minmax(0,110px)_1fr_44px] items-center gap-3">
                    <span className="text-xs font-medium text-[#1B2632] break-words [overflow-wrap:anywhere]">{s.skill}</span>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${skillBarColor(s.percentage)}`}
                        style={{
                          width: `${hasMatch(s.percentage) ? clampForDisplay(s.percentage) : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium text-[#1B2632] text-right">
                      {formatMatch(s.percentage)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Resumen (solo si hay porcentaje recibido) */}
          {matchAvailable ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm">
              <p>
                El candidato cumple con el <strong>{applicant.matchPercentage}%</strong> de los
                requisitos técnicos de la vacante.
              </p>
              {level === "Alta" && (
                <p className="text-xs mt-1">
                  Se recomienda considerarlo para la siguiente etapa del proceso.
                </p>
              )}
            </div>
          ) : (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-600 text-sm">
              El porcentaje de coincidencia técnica no está disponible para este postulante.
            </div>
          )}
        </div>
      )}

      {/* Pestañas sin contenido definido todavía */}
      {(activeTab === "cv" || activeTab === "historial") && (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#EEE9DF] text-center text-sm text-gray-500">
          Información no disponible por el momento.
        </div>
      )}
    </div>
  );
}