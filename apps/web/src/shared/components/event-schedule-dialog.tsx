'use client';

import { useState } from 'react';
import type { EventSummary } from '@/shared/components/events-ui';

interface EventScheduleDialogProps {
  event: EventSummary;
  previousScheduledAt?: string | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: (scheduledAt: string) => Promise<void>;
}

export function EventScheduleDialog({
  event,
  previousScheduledAt,
  isSubmitting,
  onCancel,
  onConfirm,
}: EventScheduleDialogProps) {
  const initialDate = previousScheduledAt ? new Date(previousScheduledAt) : null;
  const validInitialDate = initialDate && !Number.isNaN(initialDate.getTime())
    ? initialDate
    : null;
  const twoDigits = (value: number) => String(value).padStart(2, '0');

  const [date, setDate] = useState(() => validInitialDate
    ? `${validInitialDate.getFullYear()}-${twoDigits(validInitialDate.getMonth() + 1)}-${twoDigits(validInitialDate.getDate())}`
    : '');
  const [time, setTime] = useState(() => validInitialDate
    ? `${twoDigits(validInitialDate.getHours())}:${twoDigits(validInitialDate.getMinutes())}`
    : '');
  const [invalidDate, setInvalidDate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    const selected = new Date(`${date}T${time}`);

    if (!date || !time || Number.isNaN(selected.getTime()) || selected <= new Date()) {
      setInvalidDate(true);
      return;
    }

    setInvalidDate(false);
    setError(null);

    try {
      await onConfirm(selected.toISOString());
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : 'No se pudo guardar la programación. Inténtalo nuevamente.',
      );
    }
  };

  return (
    <div className="hu15-dialog-backdrop">
      <section
        className="hu15-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hu15-dialog-title"
      >
        <h2 id="hu15-dialog-title">
          {invalidDate ? 'Revisar fecha de publicación' : previousScheduledAt ? 'Modificar programación' : 'Programar publicación'}
        </h2>
        <p>
          {invalidDate
            ? 'La programación no se guardó porque la fecha es inválida.'
            : previousScheduledAt
              ? 'Actualiza la fecha y hora de una publicación todavía pendiente.'
              : 'Este evento se publicará en la fecha y hora que elijas.'}
        </p>

        <div className="hu15-event-summary">
          <small>EVENTO</small>
          <strong>{event.title}</strong>
          <span>{event.dateLabel}{event.location ? ` · ${event.location}` : ''}</span>
        </div>

        <div className="hu15-date-fields">
          <label>
            Fecha de publicación *
            <input
              type="date"
              value={date}
              aria-invalid={invalidDate}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label>
            Hora de publicación *
            <input
              type="time"
              value={time}
              aria-invalid={invalidDate}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
        </div>

        {invalidDate ? (
          <p className="hu15-date-error" role="alert">
            La fecha y hora deben ser posteriores al momento actual.
          </p>
        ) : (
          <p>El evento no aparecerá en el catálogo hasta que llegue la fecha indicada.</p>
        )}

        {previousScheduledAt && (
          <p>Horario anterior: {new Date(previousScheduledAt).toLocaleString('es-BO')}</p>
        )}

        {error && <p className="hu15-date-error" role="alert">{error}</p>}

        <p className="hu15-dialog-note">
          La publicación ocurrirá automáticamente. Puedes modificar o cancelar la
          programación antes de su ejecución.
        </p>

        <div className="hu15-dialog-actions">
          <button
            type="button"
            className="event-button event-button-secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Volver
          </button>
          <button
            type="button"
            className="event-button event-button-primary"
            onClick={() => void confirm()}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Guardando…'
              : invalidDate ? 'Corregir fecha' : previousScheduledAt ? 'Guardar cambios' : 'Confirmar programación'}
          </button>
        </div>
      </section>
    </div>
  );
}
