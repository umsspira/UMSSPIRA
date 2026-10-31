
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import {
  AlertCircle,
  Info,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react';
import type { EventPassDto } from '@umsspira/shared-types';
import { ApiClientError } from '@/shared/services/api-client';
import { SessionError } from '@/shared/services/auth-session';
import { authStore } from '@/modules/auth/frontend/store';

import { getMyEventPasses } from './event-passes-service';
import { EventPassQrCard } from './event-pass-qr-card';
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

export default function MyQrPassesPage() {
  const [passes, setPasses] = useState<EventPassDto[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState<'session' | 'forbidden' | 'unavailable' | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [filter, setFilter] = useState<PassFilter>('all');
  const [openedPassId, setOpenedPassId] = useState<string | null>(null);
  const validCount = passes.filter(isValidPass).length;
  const visiblePasses = filter === 'inactive' ? passes.filter((pass) => !isValidPass(pass)) : passes;
  const openedPass = passes.find((pass) => pass.id === openedPassId);

  const retry = useCallback(() => {
    setRetryCount((value) => value + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const unsubscribe = authStore.subscribe(() => {
      if (authStore.getState().status !== 'idle') return;
      controller.abort();
      setPasses([]);
      setOpenedPassId(null);
      setLoadError('session');
      setLoadState('error');
    });

    async function loadPasses() {
      setLoadState('loading');
      setLoadError(null);

      try {
        const result = await getMyEventPasses(controller.signal);

        if (controller.signal.aborted) return;

        if (!Array.isArray(result)) {
          throw new Error('La respuesta del servidor no es válida.');
        }

        setPasses(result);
        setLoadState('success');
      } catch (error) {
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
            <Link href="/events/catalog/passes" aria-current="page" className="active">Mis pases</Link>
          </nav>
        </div>

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
                        <button type="button" className="qr-passes-open" onClick={() => setOpenedPassId(pass.id)}>
                          {valid ? 'Abrir pase' : 'Ver detalle'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </section>
            )}
            {openedPass ? (
              <section className="qr-passes-opened" aria-label="Detalle del pase">
                <button type="button" className="qr-passes-close" onClick={() => setOpenedPassId(null)}>← Volver a mis pases</button>
                <EventPassQrCard pass={openedPass} />
              </section>
            ) : null}
          </>
        )}
      </div>
      <EventsMobileBottomNav />
    </main>
  );
}
