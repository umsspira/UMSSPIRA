'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { EventItem } from '@umsspira/shared-types';
import { useAuthenticatedUserId } from '@/modules/auth/frontend/components/authenticated-user-context';
import { getAdminEvent } from '@/shared/services/events-service';
import { EventPassScanner } from '@/features/events/event-pass-scanner';

export default function EventScannerPage() {
  const { id } = useParams<{ id: string }>();
  const userId = useAuthenticatedUserId();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setEvent(null);
    setError(null);
    if (!userId) {
      setError('No hay una sesión administrativa disponible.');
      return;
    }
    void getAdminEvent(id, userId).then(
      (result) => { if (active) setEvent(result); },
      (reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'No se pudo consultar el evento.');
      },
    );
    return () => { active = false; };
  }, [id, userId]);

  return (
    <main className="events-page hu8-page">
      <header className="hu8-heading">
        <div>
          <h1>Validación de pases QR</h1>
          <p>{event ? `${event.title} · Validación de asistencia` : 'Consulta del evento'}</p>
        </div>
      </header>
      {error ? <p role="alert" className="event-feedback">{error}</p> : !event ? (
        <p role="status">Cargando evento…</p>
      ) : (
        <EventPassScanner key={id} eventId={id} />
      )}
    </main>
  );
}
