'use client';

import { useEffect, useState } from 'react';
import { SessionError } from '@/shared/services/auth-session';
import { notifySessionExpired } from '@/modules/auth/frontend/services/session-expired';
import type { AccreditationExportFilters } from '../accreditation/services/accreditation-export.service';
import { AccreditationExportButtons } from '../accreditation/components/accreditation-export-buttons';
import type { AccreditationIndicators } from '../types/acreditacion.types';
import { AcreditacionHeader } from './acreditacion-header';
import { AcreditacionKpis } from './acreditacion-kpis';
import { AcreditacionSalaryBlock } from './acreditacion-salary-block';

// Mientras los filtros de la T3.2 no estén montados, se exporta sin filtros.
const NO_FILTERS: AccreditationExportFilters = { cohort: '', semester: '' };

interface Props {
  careerName: string;
  load: (signal: AbortSignal) => Promise<AccreditationIndicators>;
}

export function ConnectedAccreditationIndicators({ careerName, load }: Props) {
  const [data, setData] = useState<AccreditationIndicators | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setData(null);
    setError(null);

    load(controller.signal)
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
  }, [load, attempt]);

  return (
    <div className="min-w-0 space-y-4">
      <AcreditacionHeader
        careerName={careerName}
        actions={
          data ? (
            <AccreditationExportButtons
              filters={NO_FILTERS}
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
          <AcreditacionKpis
            totalResponses={data.totalResponses}
            employedPercent={data.employedPercent}
            averageInsertionMonths={data.averageInsertionMonths}
          />
          <AcreditacionSalaryBlock ranges={data.salaryRanges} />
        </>
      )}
    </div>
  );
}