
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getCurrentUser } from '@/modules/auth/frontend/services/auth.service';
import { saveOfflineQrUserId } from './offline/offline-qr-identity';
import { ApiError } from '@/shared/services/api-client';
import {
  getOfflineQrPasses,
} from './offline/offline-qr-storage';
import {
  getOfflineQrUserId,
} from './offline/offline-qr-identity';
import {
  AlertCircle,
  Info,
  LoaderCircle,
  RefreshCw,
  Ticket,
} from 'lucide-react';
import type { EventPassDto } from '@umsspira/shared-types';

import { getMyEventPasses } from './event-passes-service';
import { EventPassQrCard } from './event-pass-qr-card';

type LoadState = 'loading' | 'success' | 'error';

export default function MyQrPassesPage() {
  const [passes, setPasses] = useState<EventPassDto[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);
const [isOffline, setIsOffline] = useState(
  () => typeof navigator !== 'undefined' && !navigator.onLine,
);
  const retry = useCallback(() => {
    setRetryCount((value) => value + 1);
  }, []);

    useEffect(() => {
    const controller = new AbortController();

    async function loadOfflinePasses() {
      const userId = getOfflineQrUserId();

      if (!userId) {
        throw new Error(
          'No se encontró una identidad local para recuperar tus pases.',
        );
      }

      const savedPasses = await getOfflineQrPasses(userId);

      if (controller.signal.aborted) return;

      const offlinePasses: EventPassDto[] = savedPasses.map(
        (savedPass) => ({
          id: savedPass.id,
          registrationId: '',
          eventId: '',
          userId: savedPass.userId,
          qrToken: savedPass.qrToken,
          status: 'ACTIVO',
          isValidForAccess: true,
          issuedAt: savedPass.savedAt,
          expiresAt: null,
          eventDetails: savedPass.eventDetails,
        }),
      );

      setPasses(offlinePasses);
      setIsOffline(true);
      setLoadState('success');
      setErrorMessage('');
    }

    async function loadPasses() {
      setLoadState('loading');
	setErrorMessage('');
	setPasses([]);

      try {
        if (!navigator.onLine) {
          await loadOfflinePasses();
          return;
        }

        let currentUser;

        try {
          currentUser = await getCurrentUser();
        } catch (error) {
          if (error instanceof ApiError && error.status === 0) {
            await loadOfflinePasses();
            return;
          }

          throw error;
        }

        if (controller.signal.aborted) return;

        if (!currentUser?.id) {
          throw new Error('No se pudo verificar tu identidad.');
        }

        saveOfflineQrUserId(currentUser.id);

        let result: EventPassDto[];

        try {
          result = await getMyEventPasses(controller.signal);
        } catch (error) {
          if (error instanceof ApiError && error.status === 0) {
            await loadOfflinePasses();
            return;
          }

          throw error;
        }

        if (controller.signal.aborted) return;

        if (!Array.isArray(result)) {
          throw new Error('La respuesta del servidor no es válida.');
        }

        setPasses(result);
        setIsOffline(false);
        setLoadState('success');
      } catch (error) {
        if (controller.signal.aborted) return;

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar tus pases QR.',
        );

        setLoadState('error');
      }
    }

    function handleOnline() {
      setRetryCount((value) => value + 1);
	}

	function handleOffline() {
      setRetryCount((value) => value + 1);
	}

	window.addEventListener('online', handleOnline);
	window.addEventListener('offline', handleOffline);

    void loadPasses();

    return () => {
      controller.abort();
      window.removeEventListener('online', handleOnline);
	window.removeEventListener('offline', handleOffline);
    };
  }, [retryCount]);
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

          <Link href="/portal/eventos/mis-eventos">
      Mis eventos
	</Link>

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
          offlineUnverified={isOffline}
		/>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
