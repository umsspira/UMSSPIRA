'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { EventScannerCamera } from './event-scanner-camera';
import { validateScannedPass } from './validate-scanned-pass';

export function EventPassScanner({ eventId }: { eventId: string }) {
  const request = useRef<AbortController | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => { request.current?.abort(); }, []);

  const onRead = useCallback((qrToken: string) => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setResult(null);
    setError(null);
    void validateScannedPass(eventId, qrToken, controller.signal)
      .then(() => {
        if (!controller.signal.aborted) setResult('Pase válido. El registro de asistencia aún está pendiente.');
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : 'No se pudo validar el pase.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          request.current = null;
          setPending(false);
        }
      });
  }, [eventId]);

  return (
    <div className="event-scanner-layout">
      <EventScannerCamera
        onRead={onRead}
        disabled={pending}
        startLabel={result || error ? 'Escanear otro pase' : 'Activar cámara'}
        onStart={() => { setResult(null); setError(null); }}
      />
      <aside className="event-scanner-instructions" aria-labelledby="scanner-instructions" aria-busy={pending}>
        <h2 id="scanner-instructions">
          {pending ? 'Validando el pase' : result ? 'Pase válido' : error ? 'No se pudo validar el pase' : 'Cómo escanear'}
        </h2>
        {pending ? (
          <div className="event-scanner-result" role="status">
            <strong>Comprobando pase</strong>
            <p>Verificación de inscripción y vigencia en curso.</p>
          </div>
        ) : result ? (
          <p className="event-scanner-result" role="status">{result}</p>
        ) : error ? (
          <p className="event-scanner-result" role="alert">{error}</p>
        ) : (
          <ol>
            <li>Coloca el pase frente a la cámara.</li>
            <li>Centra el código dentro del marco.</li>
            <li>Espera el resultado en pantalla.</li>
          </ol>
        )}
        <Link href={`/events/${eventId}/participants`} className="event-button">Participantes</Link>
      </aside>
    </div>
  );
}
