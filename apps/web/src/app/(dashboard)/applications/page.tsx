'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Inbox, Clock3, CircleCheck, BellRing, RefreshCw } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/shared/components/button';
import { ApplicationDrawer } from '@/modules/applications/frontend/components/application-drawer';
import {
  fetchApplicationsBoard,
  fetchApplicationsMetrics,
  type BoardPage,
  type BoardMetrics,
} from '@/modules/applications/frontend/services/applications-board.service';
import {
  changeFilters,
  changePage,
  changePageSize,
  clampPage,
  parseApplicationsUrl,
  toApplicationsParams,
  type ApplicationsUrlState,
} from '@/modules/applications/frontend/services/application-query';
import { EMPTY_FILTERS, RequestsFilters, type BoardFilters } from './_components/requests-filters';
import { RequestsTable } from './_components/requests-table';
import { PeriodFiltersForm } from './_components/period-filters';

const CAREERS_URL = '/api/v1/registrations/careers';
const SEARCH_DELAY_MS = 400;

// Bandeja de solicitudes del backoffice (HU-04): lista, filtros, expediente y dictamen.
function ApplicationsBoardView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const query = useMemo(
    () => parseApplicationsUrl(new URLSearchParams(queryString)),
    [queryString],
  );
  const queryRef = useRef<ApplicationsUrlState>(query);
  queryRef.current = query;

  const [searchInput, setSearchInput] = useState(query.search);
  const [board, setBoard] = useState<BoardPage | null>(null);
  const [metrics, setMetrics] = useState<BoardMetrics | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [careers, setCareers] = useState<{ id: string; nombre: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const requestId = useRef(0);

  const updateQuery = useCallback((next: ApplicationsUrlState) => {
    queryRef.current = next;
    const params = toApplicationsParams(next).toString();
    router.replace(params ? `${pathname}?${params}` : pathname, { scroll: false });
  }, [pathname, router]);

  const loadBoard = useCallback(async (activeQuery: ApplicationsUrlState) => {
    const currentRequestId = ++requestId.current;
    setIsLoading(true);
    setError(null);
    const [result, metricsResult] = await Promise.all([
      fetchApplicationsBoard({
        page: activeQuery.page,
        pageSize: activeQuery.pageSize,
        career: activeQuery.career || undefined,
        status: activeQuery.status || undefined,
        search: activeQuery.search || undefined,
        period: activeQuery.period || undefined,
        year: activeQuery.year,
        from: activeQuery.from || undefined,
        to: activeQuery.to || undefined,
      }),
      fetchApplicationsMetrics(),
    ]);
    if (currentRequestId !== requestId.current) return;
    if (metricsResult.ok) {
      setMetrics(metricsResult.data);
      setMetricsError(null);
    } else {
      setMetrics(null);
      setMetricsError(metricsResult.message);
    }
    if (result.ok) {
      const clampedQuery = clampPage(activeQuery, result.data.total);
      if (clampedQuery.page !== activeQuery.page) {
        updateQuery(clampedQuery);
        return;
      }
      setBoard(result.data);
      setNeedsLogin(false);
    } else {
      setNeedsLogin(result.needsLogin);
      setError(result.message);
    }
    setIsLoading(false);
  }, [updateQuery]);

  useEffect(() => {
    setSearchInput(query.search);
  }, [query.search]);

  useEffect(() => {
    if (query.search === searchInput.trim()) return;
    const timer = setTimeout(() => {
      updateQuery(changeFilters(queryRef.current, { search: searchInput }));
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query.search, searchInput, updateQuery]);

  useEffect(() => {
    void loadBoard(query);
  }, [query, loadBoard]);

  useEffect(() => {
    fetch(CAREERS_URL, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (Array.isArray(body?.data)) setCareers(body.data);
      })
      .catch(() => undefined);
  }, []);

  function handleFiltersChange(next: BoardFilters) {
    setSearchInput(next.search);
    const currentQuery = queryRef.current;
    if (next.career !== currentQuery.career || next.status !== currentQuery.status) {
      updateQuery(changeFilters(currentQuery, {
        search: next.search,
        career: next.career,
        status: next.status,
      }));
    }
  }

  if (needsLogin) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-2xl border border-oatmeal bg-white p-8 text-center">
          <p role="alert" className="text-sm font-medium text-abyssal-blue">
            {error ?? 'Inicia sesión como administrador para ver la bandeja.'}
          </p>
          <Link href="/login" className="mt-4 inline-block">
            <Button type="button">Ir al inicio de sesión</Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
        <h1 className="text-[28px] font-bold tracking-tight text-abyssal-blue">
          Bandeja de Solicitudes{' '}
          <span className="ml-2 inline-block rounded-full bg-oatmeal/60 px-3 py-1 align-middle text-xs font-semibold text-abyssal-blue">
            {board ? `${board.total} en total` : '…'}
          </span>
        </h1>
        <p className="mt-1 text-sm text-abyssal-blue/70">
          Gestión y auditoría de expedientes de titulados de Ingeniería de Sistemas e Ingeniería Informática 
        </p>
        </div>
        <Button type="button" variant="secondary" className="flex h-9 items-center gap-2 px-3 text-xs" disabled={isLoading} onClick={() => void loadBoard(queryRef.current)}>
          <RefreshCw aria-hidden="true" className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Actualizando…' : 'Actualizar bandeja'}
        </Button>
      </header>

      <section aria-label="Indicadores de solicitudes" aria-busy={isLoading}>
        <p className="sr-only">Totales de las carreras a tu cargo. Hoy se calcula en horario de Bolivia; los filtros se aplican a la lista.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Recibidas hoy', value: metrics?.receivedToday, Icon: Inbox },
            { label: 'Pendientes', value: metrics?.pending, Icon: Clock3 },
            { label: 'Resueltas hoy', value: metrics?.resolvedToday, Icon: CircleCheck },
            { label: 'Urgentes (> 48h)', value: metrics?.urgent, Icon: BellRing, urgent: true },
          ].map(({ label, value, Icon, urgent }) => (
            <div key={label} title={urgent ? 'Solicitudes pendientes con más de 48 horas desde su registro' : 'Total de las carreras a tu cargo'}
              className={`rounded-lg border border-oatmeal bg-white px-3 py-3 shadow-sm ${urgent ? 'border-l-[3px] border-l-truffle-trouble' : ''}`}>
              <div className={`flex items-center justify-between gap-2 ${urgent ? 'text-truffle-trouble' : 'text-abyssal-blue/65'}`}>
                <p className={`text-[10px] uppercase tracking-wider ${urgent ? 'font-bold' : 'font-medium'}`}>{label}</p>
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
              </div>
              <p className={`mt-1 text-2xl font-bold ${urgent ? 'text-truffle-trouble' : 'text-abyssal-blue'}`}>{value ?? '—'}</p>
            </div>
          ))}
        </div>
        {metricsError && <p role="alert" className="mt-3 text-sm text-truffle-trouble">No se pudieron cargar los indicadores: {metricsError}</p>}
      </section>

      <section aria-label="Filtros de solicitudes" className="space-y-3 rounded-xl border border-oatmeal bg-white p-4 shadow-sm">
      <RequestsFilters
        filters={{ ...query, search: searchInput }}
        careers={careers}
        onChange={handleFiltersChange}
        onClear={() => {
          setSearchInput('');
          updateQuery(changeFilters(queryRef.current, { ...EMPTY_FILTERS, period: '', year: undefined, from: '', to: '' }));
        }}
      />

      <PeriodFiltersForm
        key={JSON.stringify([query.period, query.year, query.from, query.to])}
        filters={query}
        onApply={(periodFilters) => updateQuery(changeFilters(queryRef.current, { ...periodFilters, search: searchInput.trim() }))}
      />

      </section>

      {error && (
        <div role="alert" className="rounded-lg border border-truffle-trouble/40 bg-truffle-trouble/10 p-3 text-sm font-medium text-truffle-trouble">
          {error}
        </div>
      )}

      {isLoading && !board ? (
        <p className="rounded-2xl border border-oatmeal bg-white p-10 text-center text-sm text-abyssal-blue/70">
          Cargando solicitudes…
        </p>
      ) : (
        board && (
          <RequestsTable
            items={board.items}
            total={board.total}
            page={board.page}
            pageSize={board.pageSize}
            onPageChange={(page) => updateQuery(changePage(queryRef.current, page))}
            onPageSizeChange={(pageSize) =>
              updateQuery(changePageSize(queryRef.current, pageSize))
            }
            onSelect={setSelectedId}
          />
        )
      )}

      <ApplicationDrawer
        open={selectedId !== null}
        applicationId={selectedId}
        onClose={() => setSelectedId(null)}
        onReviewed={() => {
          setSelectedId(null);
          void loadBoard(queryRef.current);
        }}
      />
    </main>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense fallback={null}>
      <ApplicationsBoardView />
    </Suspense>
  );
}
