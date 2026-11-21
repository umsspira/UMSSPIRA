"use client";

import { useId, useState } from "react";
import { ApplicantStageTimeline } from "./applicant-stage-timeline";
import { Applicant } from "../types/applicant";
import {
  clampForDisplay,
  formatMatch,
  getMatchLevel,
  hasMatch,
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
  const tabsId = useId();
  const [activeTab, setActiveTab] = useState<Tab>("coincidencia");

  const matchAvailable = hasMatch(applicant.matchPercentage);
  const level = getMatchLevel(applicant.matchPercentage);

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
                  title={applicant.hasCv ? "El CV está registrado, pero no hay una descarga disponible" : "El postulante aún no subió su CV"}
                  className="min-h-11 md:min-h-0 justify-center px-5 py-2.5 text-sm font-bold text-gray-400 bg-gray-100 border border-gray-200 rounded-lg cursor-not-allowed inline-flex items-center gap-2"
                >
                  <DownloadIcon />
                  Descargar CV
                </button>
                <p id="cv-no-disponible" className="text-xs text-gray-500 text-center md:text-left">
                  {applicant.hasCv
                    ? "El CV está registrado, pero no hay una descarga disponible."
                    : "El postulante aún no subió su CV."}
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
              </div>
              <p className="text-sm text-gray-500 break-all">{applicant.email}</p>
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
      <div className="flex border-b border-[#EEE9DF]" role="tablist" aria-label="Información del postulante">
        {TABS.map((tab, index) => (
          <button
            key={tab.id}
            id={`${tabsId}-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-controls={`${tabsId}-panel-${tab.id}`}
            aria-selected={activeTab === tab.id}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(event) => {
              let next = index;
              if (event.key === "ArrowRight") next = (index + 1) % TABS.length;
              else if (event.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = TABS.length - 1;
              else return;
              event.preventDefault();
              const nextTab = TABS[next];
              setActiveTab(nextTab.id);
              document.getElementById(`${tabsId}-tab-${nextTab.id}`)?.focus();
            }}
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
      <div id={`${tabsId}-panel-perfil`} role="tabpanel" aria-labelledby={`${tabsId}-tab-perfil`} hidden={activeTab !== "perfil"} tabIndex={0}>
      {activeTab === "perfil" && (
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-[#EEE9DF] grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-[#1B2632]">
          <div>
            <p className="text-xs text-gray-500">Correo</p>
            <p className="font-medium break-all">{applicant.email}</p>
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
      </div>

      {/* Pestaña: Coincidencia técnica (CA-03, CA-04) */}
      <div id={`${tabsId}-panel-coincidencia`} role="tabpanel" aria-labelledby={`${tabsId}-tab-coincidencia`} hidden={activeTab !== "coincidencia"} tabIndex={0}>
      {activeTab === "coincidencia" && (
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-[#EEE9DF] space-y-6">
          <div className="grid grid-cols-1 gap-8">
            {/* Dona con el porcentaje general recibido */}
            <div className="flex flex-col items-center justify-center p-2 md:p-6">
              <h3 className="text-sm font-bold text-[#1B2632] mb-4">
                Resultado de coincidencia técnica
              </h3>
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg aria-hidden="true" className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
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

          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[#1B2632]">Comparación por requisito</h3>
              {applicant.matchCalculatedAt && (
                <span className="text-xs text-gray-500">
                  Calculado: {new Date(applicant.matchCalculatedAt).toLocaleString("es-BO")}
                </span>
              )}
            </div>
            {applicant.matchError ? (
              <p role="alert" className="text-sm text-red-700">{applicant.matchError}</p>
            ) : applicant.comparison.length === 0 ? (
              <p className="text-sm text-gray-500">
                {applicant.matchStatus === "profile-incomplete"
                  ? "No hay suficientes datos del perfil para calcular la comparación."
                  : applicant.matchStatus === "no-requirements"
                    ? "La vacante no tiene requisitos técnicos configurados."
                    : "No hay requisitos técnicos disponibles para comparar."}
              </p>
            ) : (
              <ul className="divide-y divide-[#EEE9DF] rounded-xl border border-[#EEE9DF]">
                {applicant.comparison.map((item) => (
                  <li
                    key={item.requirement}
                    className="grid grid-cols-1 gap-2 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                  >
                    <span className="text-sm font-medium text-[#1B2632]">{item.requirement}</span>
                    <span className="text-sm text-gray-600">
                      {item.matchedSkill ?? "Sin coincidencia"}
                    </span>
                    <span className={`text-xs font-bold ${
                      item.result === "exact"
                        ? "text-emerald-700"
                        : item.result === "similar"
                          ? "text-orange-700"
                          : "text-gray-500"
                    }`}>
                      {item.result === "exact" ? "Exacta" : item.result === "similar" ? "Similar" : "No encontrada"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
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
      </div>

      {/* Pestaña: CV */}
<div id={`${tabsId}-panel-cv`} role="tabpanel" aria-labelledby={`${tabsId}-tab-cv`} hidden={activeTab !== "cv"} tabIndex={0}>
{activeTab === "cv" && (
  <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#EEE9DF] text-center text-sm text-gray-500">
    {applicant.cvUrl ? (
      <a
        href={applicant.cvUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-blue-600 hover:underline"
      >
        Ver CV del postulante
      </a>
    ) : (
      applicant.hasCv
        ? "El CV está registrado, pero no hay una descarga disponible."
        : "CV no disponible por el momento."
    )}
  </div>
)}
</div>

{/* Pestaña: Historial - CA-08 */}
<div id={`${tabsId}-panel-historial`} role="tabpanel" aria-labelledby={`${tabsId}-tab-historial`} hidden={activeTab !== "historial"} tabIndex={0}>
{activeTab === "historial" && (
  <div className="space-y-4">
    <ApplicantStageTimeline
      currentStage={applicant.status}
      history={[]}
    />
  </div>
)}
</div>
    </div>
  );
}