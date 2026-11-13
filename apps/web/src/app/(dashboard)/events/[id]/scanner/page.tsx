'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { EventItem } from '@umsspira/shared-types';
import { useAuthenticatedUserId } from '@/modules/auth/frontend/components/authenticated-user-context';
import { getAdminEvent } from '@/shared/services/events-service';
import { EventScannerCamera } from '@/features/events/event-scanner-camera';

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
        <div className="event-scanner-layout">
          <EventScannerCamera key={id} />
          <aside className="event-scanner-instructions" aria-labelledby="scanner-instructions">
            <h2 id="scanner-instructions">Cómo escanear</h2>
            <ol>
              <li>Coloca el pase frente a la cámara.</li>
              <li>Centra el código dentro del marco.</li>
              <li>Espera el resultado en pantalla.</li>
            </ol>
            <Link href={`/events/${id}/participants`} className="event-button">Participantes</Link>
          </aside>
        </div>
      )}
    </main>
  );
}
