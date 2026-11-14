'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import {
  AlertCircle,
  Info,
  LoaderCircle,
  RefreshCw,

  WifiOff,
 
  
dev
} from 'lucide-react';
import type { EventPassDto } from '@umsspira/shared-types';
import { ApiClientError } from '@/shared/services/api-client';
import { SessionError } from '@/shared/services/auth-session';
import { authStore } from '@/modules/auth/frontend/store';

import { getMyEventPasses } from './event-passes-service';
import {
  getOfflineQrPasses,
  type OfflineQrPass,
} from './offline/offline-qr-storage';
import { getOfflineSessionUserId } from './offline/offline-session';
import { OfflineSyncStatus } from './offline/offline-sync-status';
import { EventsMobileBottomNav } from '@/features/events/events-mobile-bottom-nav';

type LoadState = 'loading' | 'success' | 'error';
type PassSource = 'server' | 'offline';
type PassFilter = 'all' | 'inactive';

/** Convierte un pase guardado en el dispositivo al formato que usa la tarjeta. */
function toEventPassDto(saved: OfflineQrPass): EventPassDto {
  const status = saved.status ?? 'ACTIVO';
  const isValid =
    status === 'ACTIVO' &&
    saved.isValidForAccess !== false &&
    saved.qrToken.trim() !== '';

  return {
    id: saved.id,
    registrationId: '',
    eventId: '',
    userId: saved.userId,
    qrToken: isValid ? saved.qrToken : '',
    status: isValid ? 'ACTIVO' : status === 'ACTIVO' ? 'INVALIDADO' : status,
    isValidForAccess: isValid,
    issuedAt: saved.savedAt,
    expiresAt: null,
    eventDetails: saved.eventDetails,
  };
}

/** Pases guardados del usuario con sesión vigente sin conexión (HU03 CA-06). */
async function loadSavedPasses(): Promise<EventPassDto[]> {
  const userId = getOfflineSessionUserId();
  if (!userId) return [];

  const saved = await getOfflineQrPasses(userId);
  return saved.map(toEventPassDto);
}



import { getMyEventPasses } from './event-passes-service';
import { EventsMobileBottomNav } from '@/features/events/events-mobile-bottom-nav';

type LoadState = 'loading' | 'success' | 'error';
type PassFilter = 'all' | 'inactive';


function isValidPass(pass: EventPassDto): boolean {
  return pass.status === 'ACTIVO' && pass.isValidForAccess;
}

function passSchedule(pass: EventPassDto): string {
  const value = pass.eventDetails?.dateTime;
  if (!value || Number.isNaN(new Date(value).getTime())) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-BO', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/La_Paz',
  }).format(new Date(value));
}

export default function MyQrPassesPage({ passesHref = '/events/catalog/passes' }: { passesHref?: string }) {
  const [passes, setPasses] = useState<EventPassDto[]>([]);
  const [source, setSource] = useState<PassSource>('server');
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState<'session' | 'forbidden' | 'unavailable' | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const hasLoaded = useRef(false);

  const [filter, setFilter] = useState<PassFilter>('all');
  const validCount = passes.filter(isValidPass).length;
  const visiblePasses = filter === 'inactive' ? passes.filter((pass) => !isValidPass(pass)) : passes;

  const retry = useCallback(() => {
    setRetryCount((value) => value + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const unsubscribe = authStore.subscribe(() => {
      if (authStore.getState().status !== 'idle') return;
      controller.abort();
      setPasses([]);
      setLoadError('session');
      setLoadState('error');
    });

    async function loadPasses() {

      // En recargas posteriores no se vacía la lista: evita parpadeos al reconectar.
      if (!hasLoaded.current) setLoadState('loading');

      setLoadState('loading');

      setLoadError(null);

      try {
        const result = await getMyEventPasses(controller.signal);

        if (controller.signal.aborted) return;

        if (!Array.isArray(result)) {
          throw new Error('La respuesta del servidor no es válida.');
        }

        setPasses(result);
        setSource('server');
        setLoadState('success');
        hasLoaded.current = true;
      } catch (error) {
        if (controller.signal.aborted) return;


        const isServerError =
          error instanceof ApiClientError || error instanceof SessionError;

        // Sin conexión (o fallo de red): se muestran los pases guardados.
        // Si el servidor respondió con un error (ej. sesión rechazada) no se usan.
        const isNetworkFailure = !navigator.onLine || !isServerError;

        if (isNetworkFailure) {
          try {
            const saved = await loadSavedPasses();

            if (controller.signal.aborted) return;

            if (saved.length > 0) {
              setPasses(saved);
              setSource('offline');
              setLoadState('success');
              hasLoaded.current = true;
              return;
            }
          } catch (storageError) {
            console.error('No se pudieron leer los pases guardados:', storageError);
          }
        }

        if (controller.signal.aborted) return;

        const status = error instanceof ApiClientError || error instanceof SessionError
          ? error.status : undefined;
        setLoadError(status === 401 ? 'session' : status === 403 ? 'forbidden' : 'unavailable');

        setLoadState('error');
      }
    }

    void loadPasses();

    return () => {
      controller.abort();
      unsubscribe();
    };
  }, [retryCount]);

  // HU03 CA-01: al volver la conexión la lista se actualiza sola, sin recargar la página.
  useEffect(() => {
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [retry]);

  return (
    <main className="qr-passes-page">
      <div className="qr-passes-container">
        <div className="qr-passes-topbar">
          <header className="qr-passes-heading">
            <h1>Mis pases QR</h1>
            <p>Accede a tus credenciales digitales y verifica su estado.</p>
          </header>
          <nav className="qr-passes-tabs" aria-label="Navegación de eventos">
            <Link href="/portal/eventos">Explorar</Link>
            <Link href="/portal/eventos/mis-eventos">Mis eventos</Link>
            <Link href={passesHref} aria-current="page" className="active">Mis pases</Link>
          </nav>
        </div>

        {/* HU03: resultado y última actualización de los pases guardados */}
        <OfflineSyncStatus />

        {/* Aviso cuando se muestran los pases guardados en el dispositivo */}
        {loadState === 'success' && source === 'offline' && (
          <p
            role="status"
            className="mx-auto mb-6 flex w-full max-w-4xl items-center gap-2 rounded-xl border border-oatmeal bg-white p-4 font-sans text-[14px] text-abyssal-blue"
          >
            <WifiOff size={18} aria-hidden="true" />
            Sin conexión: se muestran los pases guardados en este dispositivo.
          </p>
        )}


        {/* Estado de carga */}
        {loadState === 'loading' && (
          <section
            className="qr-passes-empty"
            role="status"
            aria-live="polite"
          >
            <LoaderCircle
              size={44}
              className="qr-passes-spinner"
              aria-hidden="true"
            />

            <h2>Cargando tus pases</h2>

            <p>
              Estamos consultando tus credenciales digitales.
            </p>
          </section>
        )}

        {/* Estado de error */}
        {loadState === 'error' && (
          <section
            className="qr-passes-empty"
            role="alert"
          >
            <AlertCircle
              size={44}
              aria-hidden="true"
            />

            <h2>No pudimos cargar tus pases</h2>

            <p>{loadError === 'session' ? 'Inicia sesión para consultar tus pases.'
              : loadError === 'forbidden' ? 'Tu cuenta no tiene permiso para consultar estos pases.'
              : 'No pudimos consultar el servidor. Inténtalo nuevamente.'}</p>

            {loadError === 'session' ? (
              <Link href="/login" className="qr-passes-button">Iniciar sesión</Link>
            ) : (
              <button type="button" className="qr-passes-button" onClick={retry}>
                <RefreshCw size={18} aria-hidden="true" />
                Reintentar
              </button>
            )}
          </section>
        )}

        {/* Estado vacío */}
        {loadState === 'success' && passes.length === 0 && (
          <section className="qr-passes-empty">
            <Info
              size={44}
              strokeWidth={1.5}
              aria-hidden="true"
            />

            <h2>Todavía no tienes pases QR</h2>

            <p>
              Inscríbete a un evento disponible para obtener
              tu pase digital cuando tu inscripción sea confirmada.
            </p>

            <Link
              href="/portal/eventos"
              className="qr-passes-button"
            >
              Explorar eventos
            </Link>
          </section>
        )}

        {/* Listado compacto; el pase completo se conserva al abrirlo. */}
        {loadState === 'success' && passes.length > 0 && (
          <>
            <div className="qr-passes-filter-bar">
              <div role="group" aria-label="Filtrar pases" className="qr-passes-filter-options">
                <button type="button" aria-pressed={filter === 'all'} className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>TODOS</button>
                <button type="button" aria-pressed={filter === 'inactive'} className={filter === 'inactive' ? 'active' : ''} onClick={() => setFilter('inactive')}>NO VIGENTES</button>
              </div>
              <p>{validCount} {validCount === 1 ? 'pase vigente' : 'pases vigentes'}</p>
            </div>
            {visiblePasses.length === 0 ? (
              <p className="qr-passes-no-results" role="status">No tienes pases no vigentes.</p>
            ) : (
              <section className="qr-passes-grid" aria-label="Listado de mis pases">
                {visiblePasses.map((pass) => {
                  const valid = isValidPass(pass);
                  return (
                    <article key={pass.id} className={`qr-passes-list-card${valid ? '' : ' is-inactive'}`}>
                      {valid && pass.qrToken ? (
                        <div className="qr-passes-list-qr" aria-label="Vista previa del código QR">
                          <QRCodeSVG value={pass.qrToken} size={130} fgColor="#1B2632" bgColor="#EEE9DF" />
                        </div>
                      ) : null}
                      <div className="qr-passes-list-copy">
                        <h2>{pass.eventDetails?.name || 'Evento sin nombre'}</h2>
                        <span className={`qr-passes-list-status${valid ? '' : ' is-inactive'}`}>{valid ? 'VÁLIDO' : pass.status === 'VENCIDO' ? 'VENCIDO' : 'PASE INVALIDADO'}</span>
                        <p>{valid ? `${passSchedule(pass)} · ${pass.eventDetails?.location || 'Ubicación no disponible'}` : 'El pase asociado ya no es válido para acceso.'}</p>
                        <Link className="qr-passes-open" href={`/mis-pases/${encodeURIComponent(pass.id)}${passesHref === '/events/catalog/passes' ? '?from=catalog' : ''}`}>
                          {valid ? 'Abrir pase' : 'Ver detalle'}
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </section>
            )}
          </>
        )}
      </div>
      <EventsMobileBottomNav />
    </main>
  );
}