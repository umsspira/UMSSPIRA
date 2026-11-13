'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EVENT_STATUS, type CreateEventDto } from '@umsspira/shared-types';
import EventForm from '@/shared/components/event-form';
import {
  EventAdminTabs,
  EventManagementContent,
  EventSuccessDialog,
} from '@/shared/components/events-ui';
import { createEvent, removeEventCover, scheduleDraftEvent, updateDraftEvent, uploadEventCover } from '@/shared/services/events-service';
import { useAuthenticatedUserId } from '@/modules/auth/frontend/components/authenticated-user-context';
import { formatEventDateTime, formatEventSchedule } from '@/shared/utils/event-date-time';

export default function CreateEventPage() {
  const userId = useAuthenticatedUserId();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const scheduledDraftId = useRef<string | null>(null);
  const [scheduledResult, setScheduledResult] = useState<{
    title: string;
    startDate: string;
    endDate: string;
    scheduledAt: string;
  } | null>(null);
  const [validationCount, setValidationCount] = useState(0);
  const [publishedEventId, setPublishedEventId] = useState<string | null>(null);

  const handleValidationChange = useCallback((count: number) => {
    setValidationCount(count);
  }, []);

  const handleSubmit = async (event: CreateEventDto, image: File | null) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setDraftSaved(false);

    try {
      if (!userId) {
        throw new Error(
          'No se pudo identificar la sesión. Vuelve a iniciar sesión.',
        );
      }

      const imageUrl = image ? await uploadEventCover(image) : undefined;
      let savedEvent;
      try {
        savedEvent = await createEvent({ ...event, imageUrl }, userId);
      } catch (error) {
        if (imageUrl) await removeEventCover(imageUrl).catch(() => undefined);
        throw error;
      }

      if (event.status === EVENT_STATUS.PUBLICADO) {
        setPublishedEventId(savedEvent.id);
      } else {
        setDraftSaved(true);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : 'No se pudo guardar el evento. Inténtalo nuevamente.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSchedule = async (
    event: CreateEventDto,
    image: File | null,
    scheduledAt: string,
  ) => {
    if (!userId) throw new Error('No se pudo identificar la sesión. Vuelve a iniciar sesión.');

    setIsSubmitting(true);
    setErrorMessage(null);

    let imageUrl: string | undefined;
    let imagePersisted = false;
    try {
      if (image) imageUrl = await uploadEventCover(image);

      let draftId = scheduledDraftId.current;
      if (draftId) {
        const { status: _status, ...changes } = event;
        await updateDraftEvent(
          draftId,
          { ...changes, ...(imageUrl ? { imageUrl } : {}) },
          userId,
        );
      } else {
        const draft = await createEvent({ ...event, imageUrl }, userId);
        draftId = draft.id;
        scheduledDraftId.current = draftId;
      }
      imagePersisted = true;

      await scheduleDraftEvent(draftId, scheduledAt, userId);
      setScheduledResult({
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        scheduledAt,
      });
    } catch (error) {
      if (imageUrl && !imagePersisted) {
        await removeEventCover(imageUrl).catch(() => undefined);
      }
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (scheduledResult) {
    return (
      <main className="events-page event-create-page">
        <header className="event-create-heading">
          <h1>Publicación programada</h1>
          <p>Tu evento quedó guardado y se publicará automáticamente.</p>
        </header>
        <div className="hu15-result-layout">
          <section className="hu15-result-card">
            <span className="hu15-status-programmed">PROGRAMADO</span>
            <h2>{scheduledResult.title}</h2>
            <p>Evento universitario · Administrador</p>
            <hr />
            <small>INICIO DEL EVENTO</small>
            <p>
              <strong>{formatEventSchedule(scheduledResult.startDate, scheduledResult.endDate)}</strong>
            </p>
            <small>PUBLICACIÓN PREVISTA</small>
            <p><strong>{formatEventDateTime(scheduledResult.scheduledAt)}</strong></p>
            <div className="hu15-result-notice">
              <strong>Pendiente de publicación</strong>
              <p>El evento todavía no aparece en el catálogo ni admite inscripciones.</p>
            </div>
          </section>

          <aside className="hu15-result-card hu15-result-aside">
            <h2>Qué sucederá ahora</h2>
            <ol>
              <li>La programación quedó registrada.</li>
              <li>Se publicará cuando llegue la fecha indicada.</li>
              <li>Después aparecerá en el catálogo.</li>
            </ol>
            <strong>Acciones disponibles</strong>
            <div className="hu15-result-actions">
              <button type="button" className="event-button event-button-secondary"
                onClick={() => router.push('/events')}>
                Volver a gestión
              </button>
              <button type="button" className="event-button event-button-primary"
                onClick={() => router.push('/events')}>
                Cambiar programación
              </button>
            </div>
          </aside>
        </div>
      </main>
    );
  }

  if (publishedEventId) {
    return (
      <>
        <EventManagementContent compact />
        <EventSuccessDialog
          eventId={publishedEventId}
          onBack={() => router.push('/events')}
        />
      </>
    );
  }

  return (
    <main className="events-page event-create-page">
      <header className="event-create-heading">
        <h1>Crear evento</h1>
        <p>
          {validationCount > 0
            ? 'Corrige los campos marcados para continuar.'
            : 'Completa la información del evento universitario.'}
        </p>
      </header>

      <EventAdminTabs active="create" />

      {errorMessage && <div className="event-feedback" role="alert">{errorMessage}</div>}
      {draftSaved && <div className="event-feedback" role="status">Borrador guardado correctamente.</div>}

      <div className="event-create-layout">
        <EventForm
          onSubmit={handleSubmit}
          onSchedule={handleSchedule}
          onCancel={() => router.push('/events')}
          onValidationChange={handleValidationChange}
          isSubmitting={isSubmitting}
        />
      </div>
    </main>
  );
}
