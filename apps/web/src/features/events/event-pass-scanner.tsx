'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { EventScannerCamera } from './event-scanner-camera';
import { validateScannedPass } from './validate-scanned-pass';

type ScannerState =
  | { status: 'idle' }
  | { status: 'validating' }
  | { status: 'valid' }
  | { status: 'error'; message: string };

export function EventPassScanner({ eventId }: { eventId: string }) {
  const request = useRef<AbortController | null>(null);
  const [state, setState] = useState<ScannerState>({ status: 'idle' });
  const pending = state.status === 'validating';

  useEffect(() => () => { request.current?.abort(); }, []);

  const onRead = useCallback((qrToken: string) => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setState({ status: 'validating' });
    void validateScannedPass(eventId, qrToken, controller.signal)
      .then(() => {
        if (!controller.signal.aborted) setState({ status: 'valid' });
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            status: 'error',
            message: reason instanceof Error ? reason.message : 'No fue posible conectar con el servidor. Vuelve a intentarlo.',
          });
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          request.current = null;
        }
      });
  }, [eventId]);

  return (
    <div className="event-scanner-layout">
      <EventScannerCamera
        onRead={onRead}
        disabled={pending}
        startLabel={state.status === 'valid' || state.status === 'error' ? 'Escanear otro pase' : 'Activar cámara'}
        onStart={() => setState({ status: 'idle' })}
      />
      <aside className="event-scanner-instructions" aria-labelledby="scanner-instructions" aria-busy={pending}>
        <h2 id="scanner-instructions">
          {pending ? 'Validando el pase' : state.status === 'valid' ? 'Pase válido' : state.status === 'error' ? 'No se pudo validar el pase' : 'Cómo escanear'}
        </h2>
        {pending ? (
          <div className="event-scanner-result" role="status">
            <strong>Comprobando pase</strong>
            <p>Verificación de inscripción y vigencia en curso.</p>
          </div>
        ) : state.status === 'valid' ? (
          <p className="event-scanner-result" role="status">Pase válido. El registro de asistencia aún está pendiente.</p>
        ) : state.status === 'error' ? (
          <p className="event-scanner-result" role="alert">{state.message}</p>
        ) : (
          <ol>
            <li>Coloca el pase frente a la cámara.</li>
            <li>Centra el código dentro del marco.</li>
            <li>Espera el resultado en pantalla.</li>
          </ol>
        )}
        {pending ? (
          <button
            type="button"
            className="event-button"
            onClick={() => {
              request.current?.abort();
              request.current = null;
              setState({ status: 'idle' });
            }}
          >
            Cancelar validación
          </button>
        ) : null}
        <Link href={`/events/${eventId}/participants`} className="event-button event-button-secondary">Participantes</Link>
      </aside>
    </div>
  );
}
