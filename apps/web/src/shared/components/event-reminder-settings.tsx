'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  EVENT_REMINDER_DEFAULT_HOURS,
  EVENT_REMINDER_MAX_HOURS,
  EVENT_REMINDER_MIN_HOURS,
} from '@umsspira/shared-types';
import {
  getEventReminderSettings,
  updateEventReminderSettings,
} from '@/shared/services/events-service';

export function EventReminderSettingsPanel() {
  const [hours, setHours] = useState(String(EVENT_REMINDER_DEFAULT_HOURS));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    void getEventReminderSettings()
      .then((settings) => {
        if (active) setHours(String(settings.anticipationHours));
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error
            ? cause.message
            : 'No se pudo cargar la configuración de recordatorios.');
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const anticipationHours = Number(hours);
    if (
      !/^\d+$/.test(hours)
      || !Number.isInteger(anticipationHours)
      || anticipationHours < EVENT_REMINDER_MIN_HOURS
      || anticipationHours > EVENT_REMINDER_MAX_HOURS
    ) {
      setError(`Ingresa un número entero entre ${EVENT_REMINDER_MIN_HOURS} y ${EVENT_REMINDER_MAX_HOURS} horas.`);
      setSaved(false);
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      const settings = await updateEventReminderSettings({ anticipationHours });
      setHours(String(settings.anticipationHours));
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error
        ? cause.message
        : 'No se pudo guardar la configuración de recordatorios.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section
      id="event-reminder-global-panel"
      className="event-reminder-global-panel"
      aria-labelledby="event-reminder-global-title"
    >
      <div>
        <h2 id="event-reminder-global-title">Recordatorios para eventos publicados</h2>
        <p>Este ajuste se aplica a los eventos publicados actuales y futuros.</p>
      </div>
      <form onSubmit={save} aria-busy={isLoading || isSaving}>
        <label htmlFor="event-reminder-global-hours">Anticipación (horas)</label>
        <input
          id="event-reminder-global-hours"
          type="number"
          min={EVENT_REMINDER_MIN_HOURS}
          max={EVENT_REMINDER_MAX_HOURS}
          step="1"
          value={hours}
          disabled={isLoading || isSaving}
          onChange={(event) => {
            setHours(event.target.value);
            setSaved(false);
            setError(null);
          }}
        />
        <button
          type="submit"
          className="event-button event-button-primary"
          disabled={isLoading || isSaving}
        >
          {isSaving ? 'Guardando…' : 'Guardar'}
        </button>
      </form>
      <p className="event-reminder-global-help">
        Se reprogramarán los avisos pendientes; el valor también se usará en nuevas inscripciones.
      </p>
      {isLoading ? <p role="status">Cargando configuración…</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {saved ? <p role="status">Configuración guardada.</p> : null}
    </section>
  );
}
