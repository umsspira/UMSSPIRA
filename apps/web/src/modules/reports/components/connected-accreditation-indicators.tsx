'use client';

import { useCallback, useEffect, useState } from 'react';
import { SessionError } from '@/shared/services/auth-session';
import { notifySessionExpired } from '@/modules/auth/frontend/services/session-expired';
import type { AccreditationExportFilters } from '../accreditation/services/accreditation-export.service';
import { AccreditationExportButtons } from '../accreditation/components/accreditation-export-buttons';
import {
  AccreditationFilters,
  AccreditationNoDataForPeriod,
  type CareerOption,
} from '../accreditation/components/accreditation-filters';
import { CohortEmployabilityChart } from '../accreditation/components/cohort-employability-chart';
import type { useAccreditationFilters } from '../accreditation/hooks/use-accreditation-filters';
import type { AccreditationIndicators } from '../types/acreditacion.types';
import { AcreditacionHeader } from './acreditacion-header';
import { AcreditacionKpis } from './acreditacion-kpis';
import { AcreditacionSalaryBlock } from './acreditacion-salary-block';

interface Props {
  careerName: string;
  load: (
    signal: AbortSignal,
    filters: AccreditationExportFilters,
  ) => Promise<AccreditationIndicators>;
  /** Filtros de la T3.2 guardados en la URL (HU-003). */
  filtersState: ReturnType<typeof useAccreditationFilters>;
  /** Carreras del administrador; con más de una se elige cuál ver (bug 2 del QA de la HU-002). */
  careers?: CareerOption[];
  /** Carrera que se consulta; vacío = la carrera de la sesión (administrador de una sola carrera). */
  career?: string;
}

export function ConnectedAccreditationIndicators({
  careerName,
  load,
  filtersState,
  careers = [],
  career = '',
}: Props) {
  const { filters, setCohort, setSemester, setCareer, clearFilters, hasActiveFilters } = filtersState;
  // Al cambiar un filtro se vuelve a pedir el tablero con ese filtro (HU-003 CA-03 y CA-04).
  const { cohort, semester } = filters;
  // La carrera solo viaja si el administrador eligió una (tiene varias); si no, decide su sesión.
  const exportFilters: AccreditationExportFilters = career
    ? { cohort, semester, career }
    : { cohort, semester };
  const loadFiltered = useCallback(
    (signal: AbortSignal) =>
      load(signal, career ? { cohort, semester, career } : { cohort, semester }),
    [load, cohort, semester, career],
  );
  const [data, setData] = useState<AccreditationIndicators | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setData(null);
    setError(null);

    loadFiltered(controller.signal)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((reason) => {
        if (!active || controller.signal.aborted) return;
        if (reason instanceof SessionError && reason.status === 401) {
          notifySessionExpired();
          return;
        }
        setError('No se pudieron cargar los indicadores de empleabilidad.');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [loadFiltered, attempt]);

  return (
    <div className="min-w-0 space-y-4">
      <AcreditacionHeader
        careerName={careerName}
        actions={
          data ? (
            <AccreditationExportButtons
              filters={exportFilters}
              hasData={data.totalResponses > 0}
            />
          ) : undefined
        }
      />

      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>
          <button type="button" className="mt-2 underline" onClick={() => setAttempt((n) => n + 1)}>
            Reintentar
          </button>
        </div>
      ) : !data ? (
        <p role="status" className="text-sm text-gray-600">Cargando indicadores…</p>
      ) : (
        <>
          <AccreditationFilters
            cohorts={
              data.availableCohorts.length > 0
                ? data.availableCohorts
                : data.cohorts.map((item) => String(item.cohort))
            }
            semesters={data.availableSemesters}
            value={{ ...filters, career }}
            careers={careers}
            onCareerChange={setCareer}
            onCohortChange={setCohort}
            onSemesterChange={setSemester}
            onClear={clearFilters}
          />
          {data.totalResponses === 0 && hasActiveFilters ? (
            <AccreditationNoDataForPeriod />
          ) : (
            <>
              <AcreditacionKpis
                totalResponses={data.totalResponses}
                employedPercent={data.employedPercent}
                averageInsertionMonths={data.averageInsertionMonths}
              />
              {/* Mock-up 01 de la HU-001: «Salario mensual» y el gráfico por cohorte lado a lado. */}
              <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                <AcreditacionSalaryBlock ranges={data.salaryRanges} />
                <CohortEmployabilityChart cohorts={data.cohorts} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}