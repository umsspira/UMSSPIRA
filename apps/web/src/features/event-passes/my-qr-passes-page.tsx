
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { EventPassDto } from '@umsspira/shared-types';

import { ApiClientError } from '@/shared/services/api-client';
import { SessionError } from '@/shared/services/auth-session';
import { authStore } from '@/modules/auth/frontend/store';

import { getMyEventPasses } from './event-passes-service';
import { getOfflineQrPasses } from './offline/offline-qr-storage';
import type { OfflineQrPass } from './offline/offline-qr-storage';
import { getOfflineSessionUserId } from './offline/offline-session';
import { OfflineSyncStatus } from './offline/offline-sync-status';
import { EventPassQrCard } from './event-pass-qr-card';
import { EventsMobileBottomNav } from '@/features/events/events-mobile-bottom-nav';

type PassSource = 'online' | 'offline';
type PassFilter = 'TODOS' | 'VIGENTES' | 'NO VIGENTES';
type LoadState = 'loading' | 'success' | 'error' | 'unauthenticated';

interface MyQrPassesPageProps {
  passesHref?: string;
}

function toEventPassDto(saved: OfflineQrPass): EventPassDto {
  const status = saved.status ?? 'ACTIVO';

  const isValid =
    status === 'ACTIVO' &&
    saved.isValidForAccess !== false &&
    Boolean(saved.qrToken);

  return {
    id: saved.id,
    registrationId: '',
    eventId: '',
    userId: saved.userId,
    qrToken: isValid ? saved.qrToken : '',
    status: isValid ? 'ACTIVO' : status,
    isValidForAccess: isValid,
    issuedAt: saved.savedAt,
    expiresAt: null,
    eventDetails: {
      name: saved.eventDetails.name,
      userName: saved.eventDetails.userName,
      dateTime: saved.eventDetails.dateTime,
      location: saved.eventDetails.location,
    },
  };
}

function isValidPass(pass: EventPassDto): boolean {
  return (
    pass.status === 'ACTIVO' &&
    pass.isValidForAccess === true &&
    Boolean(pass.qrToken)
  );
}

function isSessionError(error: unknown): boolean {
  return (
    (error instanceof ApiClientError && error.status === 401) ||
    (error instanceof SessionError && error.status === 401)
  );
}

async function loadSavedPasses(): Promise<EventPassDto[]> {
  const userId = getOfflineSessionUserId();

  if (!userId) return [];

  const saved = await getOfflineQrPasses(userId);
  return saved.map(toEventPassDto);
}

export default function MyQrPassesPage({
  passesHref = '/events/catalog/passes',
}: MyQrPassesPageProps) {
  const [passes, setPasses] = useState<EventPassDto[]>([]);
  const [source, setSource] = useState<PassSource>('online');
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [filter, setFilter] = useState<PassFilter>('TODOS');

  const validCount = useMemo(
    () => passes.filter(isValidPass).length,
    [passes],
  );

  const visiblePasses = useMemo(() => {
    if (filter === 'VIGENTES') {
      return passes.filter(isValidPass);
    }

    if (filter === 'NO VIGENTES') {
      return passes.filter((pass) => !isValidPass(pass));
    }

    return passes;
  }, [passes, filter]);

  const retry = useCallback(() => {
    setLoadState('loading');
    setLoadError('');
    setRetryCount((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const unsubscribe = authStore.subscribe(() => {
  if (authStore.getState().status === 'idle') {
    setPasses([]);
    setLoadState('unauthenticated');
    setLoadError('');
  }
});

    async function loadPasses() {
      setLoadState('loading');
      setLoadError('');

      try {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          const savedPasses = await loadSavedPasses();

          if (!active) return;

          if (!getOfflineSessionUserId()) {
            setPasses([]);
            setLoadState('unauthenticated');
            return;
          }

          setPasses(savedPasses);
          setSource('offline');
          setLoadState('success');
          return;
        }

        const onlinePasses = await getMyEventPasses(controller.signal);

        if (!active) return;

        setPasses(onlinePasses);
        setSource('online');
        setLoadState('success');
      } catch (error) {
        if (!active || controller.signal.aborted) return;

        if (isSessionError(error)) {
          setPasses([]);
          setLoadState('unauthenticated');
          return;
        }

        try {
          const savedPasses = await loadSavedPasses();

          if (!active) return;

          if (!getOfflineSessionUserId()) {
            setPasses([]);
            setLoadState('error');
            setLoadError(
              'No fue posible cargar tus pases. Comprueba tu conexión e inténtalo nuevamente.',
            );
            return;
          }

          if (savedPasses.length > 0) {
            setPasses(savedPasses);
            setSource('offline');
            setLoadState('success');
            return;
          }
        } catch {
          // Se muestra el error general si tampoco se puede consultar IndexedDB.
        }

        setPasses([]);
        setLoadState('error');
        setLoadError(
          'No fue posible cargar tus pases. Comprueba tu conexión e inténtalo nuevamente.',
        );
      }
    }

    void loadPasses();

    const handleOnline = () => {
      setRetryCount((value) => value + 1);
    };

    const handleOffline = async () => {
      try {
        const savedPasses = await loadSavedPasses();

        if (!active) return;

        if (!getOfflineSessionUserId()) {
          setPasses([]);
          setLoadState('unauthenticated');
          return;
        }

        setPasses(savedPasses);
        setSource('offline');
        setLoadState('success');
      } catch {
        if (!active) return;
        setPasses([]);
        setLoadState('error');
        setLoadError(
          'No fue posible consultar los pases guardados en este dispositivo.',
        );
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      active = false;
      controller.abort();
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [retryCount]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Mis pases QR</h1>
        <p className="mt-2 text-sm text-gray-600">
          Consulta tus pases y accede a ellos cuando los necesites.
        </p>
      </header>

      <nav
        aria-label="Navegación de eventos"
        className="mb-6 flex flex-wrap gap-5 border-b pb-3 text-sm"
      >
        <Link href="/portal/eventos">Explorar</Link>
        <Link href="/portal/eventos/mis-eventos">Mis eventos</Link>
        <Link href={passesHref} aria-current="page">
          Mis pases
        </Link>
      </nav>

      <OfflineSyncStatus />

      {loadState === 'unauthenticated' && (
        <div className="rounded-lg border p-6 text-center">
          <p className="mb-4">
            Inicia sesión para consultar tus pases QR.
          </p>
          <Link
            href="/login"
            className="font-semibold underline"
          >
            Iniciar sesión
          </Link>
        </div>
      )}

      {loadState === 'loading' && (
        <p role="status" className="py-8 text-center">
          Cargando tus pases...
        </p>
      )}

      {loadState === 'error' && (
        <div role="alert" className="rounded-lg border p-6">
          <p>{loadError}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-4 rounded-lg border px-4 py-2"
          >
            Reintentar
          </button>
        </div>
      )}

      {loadState === 'success' && (
        <>
          {source === 'offline' && (
            <div
              role="status"
              className="mb-5 rounded-lg border p-4 text-sm"
            >
              Estás consultando los pases guardados en este dispositivo.
              Su vigencia no puede comprobarse sin conexión.
            </div>
          )}

          <section
            aria-label="Resumen de pases"
            className="mb-5"
          >
            <p className="font-semibold">
              {validCount} {validCount === 1 ? 'pase vigente' : 'pases vigentes'}
            </p>
          </section>

          <div
            role="group"
            aria-label="Filtrar pases"
            className="mb-6 flex flex-wrap gap-2"
          >
            {(['TODOS', 'VIGENTES', 'NO VIGENTES'] as PassFilter[]).map(
              (value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                  className={`rounded-full border px-4 py-2 text-sm ${
                    filter === value ? 'font-bold' : ''
                  }`}
                >
                  {value}
                </button>
              ),
            )}
          </div>

          {passes.length === 0 ? (
            <div className="rounded-lg border p-8 text-center">
              <p className="font-semibold">
                Todavía no tienes pases QR
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Cuando tengas una inscripción confirmada, tus pases aparecerán aquí.
              </p>
              <Link
                href="/portal/eventos"
                className="mt-4 inline-block underline"
              >
                Explorar eventos
              </Link>
            </div>
          ) : visiblePasses.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-600">
              No hay pases en esta categoría.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {visiblePasses.map((pass) => {
                const valid = isValidPass(pass);
                const detailHref =
                  `${passesHref === '/mis-pases' ? '/mis-pases' : '/mis-pases'}/${encodeURIComponent(pass.id)}` +
                  (passesHref === '/mis-pases' ? '' : '?from=catalog');

                return (
                  <article
                    key={pass.id}
                    className="min-w-0 rounded-xl border p-4"
                  >
                    <EventPassQrCard
                      pass={pass}
                      offlineUnverified={source === 'offline' && valid}
                      fromOfflineStorage={source === 'offline'}
                    />

                    <div className="mt-3">
                      <Link
                        href={detailHref}
                        className="font-semibold underline"
                      >
                        {valid ? 'Abrir pase' : 'Ver detalle'}
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      <EventsMobileBottomNav />
    </div>
  );
}