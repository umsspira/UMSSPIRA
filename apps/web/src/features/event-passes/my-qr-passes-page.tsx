
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CalendarDays,
  Clock3,
  Info,
  LoaderCircle,
  RefreshCw,
  Ticket,
} from 'lucide-react';
import type { EventPassDto, EventPassStatus } from '@umsspira/shared-types';
import { getMyEventPasses } from './event-passes-service';

type LoadState = 'loading' | 'success' | 'error';

const STATUS_LABELS: Record<EventPassStatus, string> = {
  ACTIVO: 'Activo',
  INVALIDADO: 'Invalidado',
  VENCIDO: 'Vencido',
};

function formatDate(value: string | null): string {
  if (!value) return 'No disponible';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No disponible';

  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function EventPassCard({ pass }: { pass: EventPassDto }) {
  return (
    <article className="qr-passes-card">
      <div className="qr-passes-card-top">
        <div className="qr-passes-card-icon">
          <Ticket size={23} aria-hidden="true" />
        </div>

        <span
          className={`qr-passes-status qr-passes-status--${pass.status.toLowerCase()}`}
        >
          {STATUS_LABELS[pass.status]}
        </span>
      </div>

      <h2>Pase de evento</h2>

      <p className="qr-passes-card-description">
        Credencial digital asociada a tu inscripción.
      </p>

      <div className="qr-passes-card-details">
        <div>
          <CalendarDays size={18} aria-hidden="true" />
          <span>Emitido: {formatDate(pass.issuedAt)}</span>
        </div>

        <div>
          <Clock3 size={18} aria-hidden="true" />
          <span>Vence: {formatDate(pass.expiresAt)}</span>
        </div>
      </div>

      <div className="qr-passes-card-footer">
        <span>
          {pass.isValidForAccess
            ? 'Pase habilitado para acceso'
            : 'Pase no habilitado para acceso'}
        </span>
      </div>
    </article>
  );
}

export default function MyQrPassesPage() {
  const [passes, setPasses] = useState<EventPassDto[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => {
    setRetryCount((value) => value + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPasses() {
      setLoadState('loading');
      setErrorMessage('');

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

  return (
    <main className="qr-passes-page">
      <div className="qr-passes-container">
        <nav
          className="qr-passes-tabs"
          aria-label="Navegación de eventos"
        >
          <Link href="/events/catalog">Explorar</Link>

          <span>Mis eventos</span>

          <Link
            href="/events/catalog/passes"
            aria-current="page"
            className="active"
          >
            Mis pases
          </Link>
        </nav>

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
            <p>Estamos consultando tus credenciales digitales.</p>
          </section>
        )}

        {loadState === 'error' && (
          <section className="qr-passes-empty" role="alert">
            <AlertCircle size={44} aria-hidden="true" />

            <h2>No pudimos cargar tus pases</h2>

            <p>{errorMessage}</p>

            <button
              type="button"
              className="qr-passes-button"
              onClick={retry}
            >
              <RefreshCw size={18} aria-hidden="true" />
              Reintentar
            </button>
          </section>
        )}

        {loadState === 'success' && passes.length === 0 && (
          <section className="qr-passes-empty">
            <Info size={44} strokeWidth={1.5} aria-hidden="true" />

            <h2>Todavía no tienes pases QR</h2>

            <p>
              Inscríbete a un evento disponible para obtener
              tu pase digital cuando tu inscripción sea confirmada.
            </p>

            <Link href="/events/catalog" className="qr-passes-button">
              Explorar eventos
            </Link>
          </section>
        )}

        {loadState === 'success' && passes.length > 0 && (
          <section
            className="qr-passes-grid"
            aria-label="Listado de mis pases"
          >
            {passes.map((pass) => (
              <EventPassCard key={pass.id} pass={pass} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
