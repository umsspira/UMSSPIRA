'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { ConnectedCompetencyHeatmap } from '@/modules/reports/components/competency-heatmap';
import { loadCompetencyHeatmapForCohort } from '@/modules/reports/services/competency-heatmap.adapter';
import { authenticatedFetch, SessionError } from '@/shared/services/auth-session';
import { notifySessionExpired } from '@/modules/auth/frontend/services/session-expired';
import { ConnectedAccreditationIndicators } from '@/modules/reports/components/connected-accreditation-indicators';
import { loadAccreditationIndicators } from '@/modules/reports/services/accreditation-indicators.adapter';
import { SemesterHeatmapNote } from '@/modules/reports/accreditation/components/accreditation-filters';
import { useAccreditationFilters } from '@/modules/reports/accreditation/hooks/use-accreditation-filters';

/**
 * Indicadores, filtros (HU-003) y mapa de calor del tablero. Va dentro de <Suspense>
 * porque los filtros leen la URL con useSearchParams.
 */
function AccreditationDashboard({ careerName }: { careerName: string }) {
  const filtersState = useAccreditationFilters();
  const { cohort } = filtersState.filters;
  const loadHeatmap = useMemo(() => loadCompetencyHeatmapForCohort(cohort), [cohort]);
  return (
    <div className="min-w-0 space-y-6">
      <ConnectedAccreditationIndicators
        careerName={careerName}
        load={loadAccreditationIndicators}
        filtersState={filtersState}
      />
      <SemesterHeatmapNote visible={filtersState.isSemesterActive} />
      {/* key: al cambiar la cohorte el mapa se vuelve a pedir con una sola fila (HU-003 CA-03). */}
      <ConnectedCompetencyHeatmap key={cohort || 'todas'} careerName={careerName} load={loadHeatmap} />
    </div>
  );
}

const REPORTS_ACTIVE_TAB_KEY = 'umsspira:reports-active-tab';

function navigateToReportsTab(tab: 'dashboard' | 'graduates'): void {
  try { window.localStorage.setItem(REPORTS_ACTIVE_TAB_KEY, tab); } catch { /* almacenamiento opcional */ }
}

type UserResponse = {
  data?: {
    role?: unknown;
    scopes?: { careerIds?: unknown };
  };
};

type CareerResponse = {
  data?: Array<{ id?: unknown; nombre?: unknown }>;
};

/**
 * Integración HU-EP09-06: ruta nueva bajo los layouts administrativos existentes.
 * El backend delimita las carreras autorizadas; no enviamos IDs elegidos por el cliente.
 */
export default function AccreditationHeatmapPage() {
  const [careerName, setCareerName] = useState<string | null>(null);
  const [loadingCareer, setLoadingCareer] = useState(true);
  const [identityError, setIdentityError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function identifyCareer() {
      try {
        const meResponse = await authenticatedFetch('/api/v1/auth/me', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (meResponse.status === 401) throw new SessionError(401, 'Sesión expirada');
        if (!meResponse.ok) throw new Error('No se pudo verificar la carrera del administrador.');

        const user = (await meResponse.json()) as UserResponse;
        const rawIds = user.data?.scopes?.careerIds;
        if (user.data?.role !== 'administrador' || !Array.isArray(rawIds) ||
            rawIds.length === 0 || !rawIds.every((id) => typeof id === 'string')) {
          throw new Error('No hay carreras autorizadas para consultar este reporte.');
        }
        const careerIds = rawIds as string[];

        // El catálogo únicamente aporta nombres. El scope de seguridad lo impone T2.1.
        let displayName = careerIds.length === 1
          ? 'Carrera asignada (nombre no disponible)'
          : 'Carreras asignadas (nombres no disponibles)';
        try {
          const careersResponse = await authenticatedFetch('/api/v1/registrations/careers', {
            cache: 'no-store',
            signal: controller.signal,
          });
          if (careersResponse.ok) {
            const catalog = (await careersResponse.json()) as CareerResponse;
            const assigned = Array.isArray(catalog.data)
              ? catalog.data.filter((career) =>
                  typeof career.id === 'string' && careerIds.includes(career.id) &&
                  typeof career.nombre === 'string' && career.nombre.trim().length > 0,
                ).map((career) => career.nombre as string)
              : [];
            if (assigned.length === careerIds.length) displayName = assigned.join(', ');
          }
        } catch (reason) {
          if (controller.signal.aborted) return;
          if (reason instanceof SessionError && reason.status === 401) throw reason;
          // Un fallo del catálogo no debe impedir consultar el mapa autorizado.
        }

        if (active && !controller.signal.aborted) setCareerName(displayName);
      } catch (reason) {
        if (!active || controller.signal.aborted) return;
        if (reason instanceof SessionError && reason.status === 401) {
          notifySessionExpired();
          return;
        }
        setIdentityError(reason instanceof Error ? reason.message : 'No se pudo verificar el acceso al reporte.');
      } finally {
        if (active && !controller.signal.aborted) setLoadingCareer(false);
      }
    }

    void identifyCareer();
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return (
    <main className="min-w-0 w-full p-6">
      <nav aria-label="Secciones de reporte" className="flex min-w-0 flex-wrap border-b border-gray-200">
        <Link href="/reports" onClick={() => navigateToReportsTab('dashboard')}
          className="border-b-2 border-transparent px-5 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700">
          Dashboard
        </Link>
        <Link href="/reports" onClick={() => navigateToReportsTab('graduates')}
          className="border-b-2 border-transparent px-5 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700">
          Titulados
        </Link>
        <span aria-current="page" className="border-b-2 border-[#1e293b] px-5 py-2.5 text-sm font-semibold text-[#1e293b]">
          Tablero de acreditación
        </span>
      </nav>
      <div className="mt-4 min-w-0">
        {loadingCareer ? (
          <p role="status" className="text-sm text-gray-600">Verificando carrera del administrador…</p>
        ) : identityError ? (
          <p role="alert" className="text-sm text-red-700">{identityError}</p>
        ) : careerName ? (
          <Suspense fallback={<p role="status" className="text-sm text-gray-600">Cargando tablero…</p>}>
            <AccreditationDashboard careerName={careerName} />
          </Suspense>
        ) : null}
      </div>
    </main>
  );
}
