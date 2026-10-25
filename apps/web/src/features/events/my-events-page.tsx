'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CircleAlert, Info } from 'lucide-react';
import {
  EVENT_PARTICIPATION_STATUS,
  type EventParticipationStatus,
  type MyEventRegistrationItem,
} from '@umsspira/shared-types';

import { getMyEventRegistrations } from '@/shared/services/events-service';
import { formatEventCardSchedule } from '@/shared/utils/event-date-time';

type StatusFilter = 'all' | 'cancelled' | 'finished';
type Tone = 'active' | 'cancelled' | 'finished';

const STATUS_LABEL: Record<EventParticipationStatus, string> = {
  VIGENTE: 'CONFIRMADA',
  INSCRIPCION_CANCELADA: 'INSCRIPCIÓN CANCELADA',
  EVENTO_CANCELADO: 'EVENTO CANCELADO',
  FINALIZADO: 'FINALIZADO',
};

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'TODOS' },
  { value: 'cancelled', label: 'CANCELADOS' },
  { value: 'finished', label: 'FINALIZADOS' },
];

function toneOf(status: EventParticipationStatus): Tone {
  if (status === EVENT_PARTICIPATION_STATUS.VIGENTE) return 'active';
  if (status === EVENT_PARTICIPATION_STATUS.FINALIZADO) return 'finished';
  return 'cancelled';
}

function matchesFilter(item: MyEventRegistrationItem, filter: StatusFilter): boolean {
  if (filter === 'cancelled') return toneOf(item.participationStatus) === 'cancelled';
  if (filter === 'finished') return item.participationStatus === EVENT_PARTICIPATION_STATUS.FINALIZADO;
  return true;
}

function countLabel(filter: StatusFilter, count: number): string {
  const one = count === 1;
  if (filter === 'cancelled') return `${count} ${one ? 'evento cancelado' : 'eventos cancelados'}`;
  if (filter === 'finished') return `${count} ${one ? 'evento finalizado' : 'eventos finalizados'}`;
  return `${count} ${one ? 'evento asociado a tu cuenta' : 'eventos asociados a tu cuenta'}`;
}

export default function MyEventsPage() {
  const [items, setItems] = useState<MyEventRegistrationItem[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      setItems(await getMyEventRegistrations());
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleItems = useMemo(
    () => items.filter((item) => matchesFilter(item, filter)),
    [items, filter],
  );

  return (
    <main className="hu2-catalog-page">
      <div className="hu2-catalog-shell">
        <header className="hu2-catalog-header">
          <div className="hu2-catalog-heading">
            <h1>Mis eventos</h1>
            <p>Revisa tus próximas participaciones y el estado de cada inscripción.</p>
          </div>
          <nav className="hu2-catalog-tabs" aria-label="Secciones de eventos">
            <Link href="/portal/eventos">Explorar</Link>
            <button type="button" className="is-active" aria-current="page">
              Mis eventos
            </button>
            <button type="button" disabled title="Disponible al integrar HU10">
              Mis pases
            </button>
          </nav>
        </header>

        {isLoading ? (
          <>
            <p className="hu2-results-count" role="status">
              Estamos recuperando tus próximas participaciones.
            </p>
            <div className="hu9-list" aria-hidden="true">
              {[0, 1, 2, 3].map((n) => (
                <div key={n} className="hu9-skeleton-card" />
              ))}
            </div>
          </>
        ) : hasError ? (
          <section className="hu2-catalog-state hu2-error-state" role="alert">
            <span className="hu2-state-icon" aria-hidden="true">
              <CircleAlert size={52} />
            </span>
            <h2>No pudimos cargar tus eventos</h2>
            <p>Revisa tu conexión e inténtalo nuevamente. Tus inscripciones continúan guardadas.</p>
            <button type="button" className="hu2-search-button" onClick={() => void load()}>
              Reintentar
            </button>
          </section>
        ) : items.length === 0 ? (
          <section className="hu2-catalog-state hu9-empty" role="status">
            <span className="hu2-state-icon" aria-hidden="true">
              <Info size={52} />
            </span>
            <h2>Aún no estás inscrito en ningún evento</h2>
            <p>Explora el catálogo y reserva tu participación en los eventos disponibles.</p>
            <Link href="/portal/eventos" className="hu2-detail-link hu9-center-link">
              Explorar eventos
            </Link>
          </section>
        ) : (
          <>
            <div className="hu9-filter-bar">
              <div className="hu9-filter-chips" role="group" aria-label="Filtrar mis eventos">
                {FILTERS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`hu9-filter-chip ${filter === option.value ? 'is-active' : ''}`}
                    aria-pressed={filter === option.value}
                    onClick={() => setFilter(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="hu9-count">{countLabel(filter, visibleItems.length)}</p>
            </div>

            {visibleItems.length === 0 ? (
              <section className="hu2-catalog-state hu9-empty" role="status">
                <span className="hu2-state-icon" aria-hidden="true">
                  <Info size={52} />
                </span>
                <h2>
                  {filter === 'finished' ? 'No tienes eventos finalizados' : 'No tienes eventos cancelados'}
                </h2>
                <p>
                  {filter === 'finished'
                    ? 'Los eventos en los que participes aparecerán aquí cuando finalicen.'
                    : 'Aquí aparecerán los eventos o inscripciones que hayan sido cancelados.'}
                </p>
                <Link href="/portal/eventos" className="hu2-detail-link hu9-center-link">
                  Explorar eventos
                </Link>
              </section>
            ) : (
              <div className="hu9-list">
                {visibleItems.map((item) => {
                  const tone = toneOf(item.participationStatus);
                  const canOpenPass =
                    item.hasPass && item.participationStatus === EVENT_PARTICIPATION_STATUS.VIGENTE;

                  return (
                    <article key={item.id} className={`hu9-event-card is-${tone}`}>
                      <h2>{item.event.title}</h2>
                      <span className={`hu9-status-chip is-${tone}`}>
                        {STATUS_LABEL[item.participationStatus]}
                      </span>
                      <div className="hu9-event-meta">
                        <p className="hu9-event-schedule">
                          {formatEventCardSchedule(item.event.startDate, item.event.endDate)}
                        </p>
                        <p>
                          {item.event.location
                            ? `Ubicación: ${item.event.location}`
                            : 'Ubicación no especificada'}
                        </p>
                      </div>
                      <div className="hu9-event-actions">
                        <Link href={`/portal/eventos/${item.event.id}`} className="hu9-action">
                          Ver detalle
                        </Link>
                        {canOpenPass ? (
                          <button
                            type="button"
                            className="hu9-action"
                            disabled
                            title="Disponible al integrar HU10"
                          >
                            Ver pase
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}