'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CircleAlert, Inbox, RefreshCw, X } from 'lucide-react';
import { ConfirmModal } from '@/shared/components/confirm-modal';
import {
  cancelMyRequest,
  listMyRequests,
  MyRequestsError,
  type MyRequest,
  type MyRequestCounts,
  type MyRequestFilter,
  type MyRequestPage,
} from '../services/my-requests-api';

const STATUS_LABELS: Record<Exclude<MyRequestFilter, 'TODAS'>, string> = {
  PENDIENTE: 'Pendiente',
  ACEPTADO: 'Aceptada',
  RECHAZADO: 'Rechazada',
  CANCELADO: 'Cancelada',
};

const STATUS_CLASSES: Record<Exclude<MyRequestFilter, 'TODAS'>, string> = {
  PENDIENTE: 'pendiente',
  ACEPTADO: 'aceptada',
  RECHAZADO: 'rechazada',
  CANCELADO: 'cancelada',
};

const TABS: { id: MyRequestFilter; label: string }[] = [
  { id: 'TODAS', label: 'Todas' },
  { id: 'PENDIENTE', label: 'Pendientes' },
  { id: 'ACEPTADO', label: 'Aceptadas' },
  { id: 'RECHAZADO', label: 'Rechazadas' },
  { id: 'CANCELADO', label: 'Canceladas' },
];

const EMPTY_COUNTS: MyRequestCounts = {
  TODAS: 0,
  PENDIENTE: 0,
  ACEPTADO: 0,
  RECHAZADO: 0,
  CANCELADO: 0,
};

const EMPTY_PAGE: MyRequestPage = {
  items: [],
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
  counts: EMPTY_COUNTS,
};

function formatDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function initials(name: string | null): string {
  return (name ?? 'Mentor')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function StatusPill({ status }: { status: Exclude<MyRequestFilter, 'TODAS'> }) {
  return (
    <span
      className={`received-status received-status-${STATUS_CLASSES[status]}`}
      aria-label={`Estado: ${STATUS_LABELS[status]}`}
    >
      <span aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function MyRequests() {
  const [filter, setFilter] = useState<MyRequestFilter>('TODAS');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<MyRequestPage>(EMPTY_PAGE);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState<MyRequest | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [notice, setNotice] = useState('');
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    void listMyRequests(
      { status: filter === 'TODAS' ? undefined : filter, page },
      controller.signal,
    )
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(
          error instanceof Error ? error.message : 'No se pudieron cargar tus solicitudes.',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [filter, page, reload]);

  function changeFilter(next: MyRequestFilter) {
    setFilter(next);
    setPage(1);
    setNotice('');
  }

  function openCancel(request: MyRequest) {
    setCancelError('');
    setNotice('');
    setSuccessMessage('');
    setSelected(request);
  }

  function closeCancel() {
    if (cancelling) return;
    setSelected(null);
    setCancelError('');
  }

  async function confirmCancel() {
    if (!selected || inFlight.current) return;
    inFlight.current = true;
    setCancelling(true);
    setCancelError('');
    try {
      const updated = await cancelMyRequest(selected.id);
      setData((current) => {
        const items =
          filter === 'PENDIENTE'
            ? current.items.filter((item) => item.id !== updated.id)
            : current.items.map((item) => (item.id === updated.id ? updated : item));
        const total = filter === 'PENDIENTE' ? Math.max(0, current.total - 1) : current.total;
        return {
          ...current,
          items,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / current.pageSize),
          counts: {
            ...current.counts,
            PENDIENTE: Math.max(0, current.counts.PENDIENTE - 1),
            CANCELADO: current.counts.CANCELADO + 1,
          },
        };
      });
      setSelected(null);
      setSuccessMessage('Solicitud cancelada. El mentor verá el estado Cancelada.');
    } catch (error) {
      if (error instanceof MyRequestsError && error.status === 409) {
        setSelected(null);
        setNotice('Esta solicitud ya no está pendiente. Actualizamos el listado con su estado real.');
        setReload((value) => value + 1);
      } else if (
        error instanceof MyRequestsError &&
        (error.status === 404 || error.status === 403)
      ) {
        setSelected(null);
        setNotice('La solicitud no existe o no te pertenece. Actualizamos el listado.');
        setReload((value) => value + 1);
      } else {
        setCancelError(
          error instanceof Error
            ? error.message
            : 'No se pudo cancelar la solicitud. Intenta nuevamente.',
        );
      }
    } finally {
      inFlight.current = false;
      setCancelling(false);
    }
  }

  const emptyTitle =
    filter === 'TODAS'
      ? 'Aún no has enviado solicitudes de mentoría.'
      : 'No tienes solicitudes en este estado.';

  return (
    <main className="mentorship-shell received-page">
      <header className="received-title-block my-requests-heading">
        <div>
          <h1>Mis solicitudes de mentoría</h1>
          <p>
            Historial de las solicitudes que enviaste. Solo puedes cancelar las que están
            pendientes.
          </p>
        </div>
        <button
          type="button"
          className="received-button my-requests-refresh"
          onClick={() => setReload((value) => value + 1)}
          disabled={loading}
        >
          <RefreshCw size={15} aria-hidden="true" />
          Actualizar
        </button>
      </header>

      <div className="received-tabs" role="tablist" aria-label="Filtrar solicitudes por estado">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={filter === tab.id}
            className={filter === tab.id ? 'is-active' : ''}
            onClick={() => changeFilter(tab.id)}
          >
            {tab.label}
            <span>{data.counts[tab.id]}</span>
          </button>
        ))}
      </div>

      {successMessage && (
        <p className="my-requests-success" role="status">
          {successMessage}
        </p>
      )}

      {notice && (
        <div className="received-error my-requests-notice" role="alert">
          {notice}
        </div>
      )}

      {loadError && (
        <div className="received-error" role="alert">
          {loadError}
          <button type="button" onClick={() => setReload((value) => value + 1)}>
            Reintentar
          </button>
        </div>
      )}

      {loading ? (
        <p role="status">Cargando solicitudes…</p>
      ) : data.items.length === 0 ? (
        <div className="received-empty my-requests-empty">
          <span className="received-empty-icon">
            <Inbox size={21} aria-hidden="true" />
          </span>
          <h2>{emptyTitle}</h2>
          <p>
            {filter === 'TODAS'
              ? 'Cuando envíes una solicitud, aparecerá aquí con su estado.'
              : 'Prueba con otra pestaña o actualiza el listado para ver los cambios.'}
          </p>
          {filter === 'TODAS' ? (
            <Link href="/mentorship/directory" className="received-button my-requests-link">
              Explorar mentores
            </Link>
          ) : (
            <button
              type="button"
              className="received-button my-requests-link"
              onClick={() => changeFilter('TODAS')}
            >
              Ver todas
            </button>
          )}
        </div>
      ) : (
        <div className="sent-table-wrap">
          <table className="sent-table" aria-label="Historial de solicitudes de mentoría">
            <thead>
              <tr>
                <th scope="col">Mentor</th>
                <th scope="col">Cargo</th>
                <th scope="col">Fecha</th>
                <th scope="col">Horario</th>
                <th scope="col">Motivo</th>
                <th scope="col">Estado</th>
                <th scope="col">Acción</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((request) => (
                <tr key={request.id}>
                  <td>
                    <div className="sent-mentor">
                      <span className="sent-mentor-avatar" aria-hidden="true">
                        {initials(request.mentor.nombre)}
                      </span>
                      <span>
                        <strong>{request.mentor.nombre || 'Mentor'}</strong>
                      </span>
                    </div>
                  </td>
                  <td className="my-requests-position">{request.mentor.cargo || '—'}</td>
                  <td>{formatDate(request.fecha)}</td>
                  <td>
                    {request.hora_inicio} – {request.hora_fin}
                  </td>
                  <td className="sent-reason">{request.mensaje || 'Sin mensaje'}</td>
                  <td>
                    <StatusPill status={request.estado} />
                  </td>
                  <td>
                    {request.estado === 'PENDIENTE' ? (
                      <button
                        type="button"
                        className="received-button sent-cancel"
                        onClick={() => openCancel(request)}
                      >
                        Cancelar solicitud
                      </button>
                    ) : (
                      <span className="sent-no-action">Sin acciones</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && data.totalPages > 1 && (
        <div className="received-pagination">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Anterior
          </button>
          <span>
            Página {page} de {data.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= data.totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            Siguiente
          </button>
        </div>
      )}

      <ConfirmModal
        open={selected !== null}
        icon={CircleAlert}
        eyebrow="Cancelar solicitud"
        title="¿Cancelar esta solicitud de mentoría?"
        description={
          <>
            La solicitud dejará de estar pendiente y el mentor verá el estado como Cancelada.
            Esta acción no se puede deshacer.
          </>
        }
        cancelLabel="Volver"
        confirmLabel={cancelling ? 'Cancelando…' : 'Sí, cancelar'}
        confirming={cancelling}
        onCancel={closeCancel}
        onConfirm={() => void confirmCancel()}
      >
        {selected && (
          <div className="received-modal-summary">
            <div>
              <span>Mentor</span>
              <strong>{selected.mentor.nombre || 'Mentor'}</strong>
            </div>
            <div>
              <span>Fecha</span>
              <strong>{formatDate(selected.fecha)}</strong>
            </div>
            <div>
              <span>Horario</span>
              <strong>
                {selected.hora_inicio} – {selected.hora_fin}
              </strong>
            </div>
            <div>
              <span>Motivo</span>
              <strong>{selected.mensaje || 'Sin mensaje'}</strong>
            </div>
          </div>
        )}
        {cancelError && (
          <p className="received-action-error" role="alert">
            <X size={14} aria-hidden="true" /> {cancelError}
          </p>
        )}
      </ConfirmModal>
    </main>
  );
}
