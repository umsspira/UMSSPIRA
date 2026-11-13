'use client';

import React from 'react';
import { ALL, type AccreditationFilters as Filters } from '../hooks/use-accreditation-filters';

export const MESSAGES = {
  cohortLabel: 'Cohorte',
  semesterLabel: 'Semestre',
  allCohorts: 'Todas',
  allSemesters: 'Todos',
  clear: 'Limpiar filtros',
  noData: 'No hay información para el periodo seleccionado',
  semesterHeatmapNote: 'El filtro de semestre no se aplica al mapa de calor',
} as const;

interface AccreditationFiltersProps {
  /** Años de las cohortes con datos (CA-01). */
  cohorts: string[];
  /** Semestres con encuestas enviadas, en formato «2/2026» (CA-02). */
  semesters: string[];
  value: Filters;
  onCohortChange: (cohort: string) => void;
  onSemesterChange: (semester: string) => void;
  onClear: () => void;
  disabled?: boolean;
}

const selectClassName =
  'h-11 w-full rounded-md border border-[#C9C1B1] bg-white px-3 text-sm text-[#1B2632] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB162] disabled:cursor-not-allowed disabled:opacity-60';

/** Orden: cohortes de la más antigua a la más reciente; semestres del más reciente al más antiguo. */
function sortCohorts(cohorts: string[]) {
  return Array.from(new Set(cohorts)).sort((a, b) => Number(a) - Number(b));
}

function semesterKey(semester: string) {
  const [term, year] = semester.split('/').map(Number);
  return year * 10 + term;
}

function sortSemesters(semesters: string[]) {
  return Array.from(new Set(semesters)).sort((a, b) => semesterKey(b) - semesterKey(a));
}

/**
 * Filtros «Cohorte» y «Semestre» del tablero de acreditación (HU-003, CA-01, CA-02 y CA-07).
 * Se adapta desde 390 px: en móvil los selectores ocupan todo el ancho.
 */
export function AccreditationFilters({
  cohorts,
  semesters,
  value,
  onCohortChange,
  onSemesterChange,
  onClear,
  disabled = false,
}: AccreditationFiltersProps) {
  const cohortOptions = sortCohorts(cohorts);
  const semesterOptions = sortSemesters(semesters);

  return (
    <section
      aria-label="Filtros del tablero"
      className="flex w-full flex-col gap-3 rounded-lg bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end"
    >
      <div className="flex w-full flex-col gap-1.5 sm:w-40">
        <label htmlFor="accreditation-cohort" className="text-sm font-semibold text-[#1B2632]">
          {MESSAGES.cohortLabel}
        </label>
        <select
          id="accreditation-cohort"
          value={value.cohort}
          disabled={disabled}
          onChange={(e) => onCohortChange(e.target.value)}
          className={selectClassName}
        >
          <option value={ALL}>{MESSAGES.allCohorts}</option>
          {cohortOptions.map((cohort) => (
            <option key={cohort} value={cohort}>
              {cohort}
            </option>
          ))}
        </select>
      </div>

      <div className="flex w-full flex-col gap-1.5 sm:w-40">
        <label htmlFor="accreditation-semester" className="text-sm font-semibold text-[#1B2632]">
          {MESSAGES.semesterLabel}
        </label>
        <select
          id="accreditation-semester"
          value={value.semester}
          disabled={disabled}
          onChange={(e) => onSemesterChange(e.target.value)}
          className={selectClassName}
        >
          <option value={ALL}>{MESSAGES.allSemesters}</option>
          {semesterOptions.map((semester) => (
            <option key={semester} value={semester}>
              {semester}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={onClear}
        disabled={disabled}
        className="self-start py-2 text-sm font-semibold text-[#9B4A2C] underline underline-offset-2 hover:text-[#7A3A22] disabled:cursor-not-allowed disabled:opacity-60 sm:self-end sm:py-3"
      >
        {MESSAGES.clear}
      </button>
    </section>
  );
}

/** Mensaje cuando la combinación de filtros no tiene datos (CA-08). */
export function AccreditationNoDataForPeriod() {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center rounded-lg bg-white px-4 py-10 text-center shadow-sm"
    >
      <div
        aria-hidden="true"
        className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF1E2] text-lg font-bold text-[#9B4A2C]"
      >
        i
      </div>
      <p className="text-base font-semibold text-[#1B2632]">{MESSAGES.noData}</p>
    </div>
  );
}

/** Nota sobre el mapa de calor cuando hay un semestre elegido (CA-05). */
export function SemesterHeatmapNote({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <p role="note" className="text-sm text-[#5B6470]">
      {MESSAGES.semesterHeatmapNote}
    </p>
  );
}