'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
    <div>
      <EventScannerCamera onRead={onRead} disabled={pending} />
      {pending ? <p role="status">Validando el pase…</p> : null}
      {result ? <p role="status">{result}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
