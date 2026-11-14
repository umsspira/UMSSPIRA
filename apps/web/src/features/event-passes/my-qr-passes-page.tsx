'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Info,
  LoaderCircle,
  RefreshCw,
  Ticket,
  WifiOff,
} from 'lucide-react';
import type { EventPassDto } from '@umsspira/shared-types';

import { ApiClientError } from '@/shared/services/api-client';
import { getMyEventPasses } from './event-passes-service';
import { EventPassQrCard } from './event-pass-qr-card';
import {
  getOfflineQrPasses,
  type OfflineQrPass,
} from './offline/offline-qr-storage';
import { getOfflineSessionUserId } from './offline/offline-session';
import { OfflineSyncStatus } from './offline/offline-sync-status';

type LoadState = 'loading' | 'success' | 'error';
type PassSource = 'server' | 'offline';

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

export default function MyQrPassesPage() {
  const [passes, setPasses] = useState<EventPassDto[]>([]);
  const [source, setSource] = useState<PassSource>('server');
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const hasLoaded = useRef(false);

  const retry = useCallback(() => {
    setRetryCount((value) => value + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPasses() {
      // En recargas posteriores no se vacía la lista: evita parpadeos al reconectar.
      if (!hasLoaded.current) setLoadState('loading');
      setErrorMessage('');

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

        // Sin conexión (o fallo de red): se muestran los pases guardados.
        // Si el servidor respondió con un error (ej. sesión rechazada) no se usan.
        const isNetworkFailure =
          !navigator.onLine || !(error instanceof ApiClientError);

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

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar tus pases QR.',
        );

        setLoadState('error');
      }
    }

    void loadPasses();

    return () => controller.abort();
  }, [retryCount]);

  // HU03 CA-01: al volver la conexión la lista se actualiza sola, sin recargar la página.
  useEffect(() => {
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [retry]);

  return (
    <main className="qr-passes-page">
      <div className="qr-passes-container">
        {/* Navegación de eventos */}
        <nav
          className="qr-passes-tabs"
          aria-label="Navegación de eventos"
        >
          <Link href="/events/catalog">
            Explorar
          </Link>

          <span>Mis eventos</span>

          <Link
            href="/events/catalog/passes"
            aria-current="page"
            className="active"
          >
            Mis pases
          </Link>
        </nav>

        {/* Encabezado */}
        <header className="qr-passes-heading">
          <div className="qr-passes-heading-icon">
            <Ticket size={24} aria-hidden="true" />
          </div>

          <h1>Mis pases QR</h1>

          <p>
            Consulta el estado de tus credenciales digitales
            para los eventos en los que te inscribiste.
          </p>
        </header>

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

            <p>{errorMessage}</p>

            <button
              type="button"
              className="qr-passes-button"
              onClick={retry}
            >
              <RefreshCw
                size={18}
                aria-hidden="true"
              />

              Reintentar
            </button>
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
              href="/events/catalog"
              className="qr-passes-button"
            >
              Explorar eventos
            </Link>
          </section>
        )}

        {/* Listado de pases QR */}
        {loadState === 'success' && passes.length > 0 && (
          <section
            className="qr-passes-grid"
            aria-label="Listado de mis pases"
          >
            {passes.map((pass) => (
              <EventPassQrCard
                key={pass.id}
                pass={pass}
                fromOfflineStorage={source === 'offline'}
              />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}