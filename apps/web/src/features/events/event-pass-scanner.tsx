'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { EventAttendanceResult } from '@umsspira/shared-types';
import { formatEventDateTime } from '@/shared/utils/event-date-time';
import { ApiClientError } from '@/shared/services/api-client';
import { SessionError } from '@/shared/services/auth-session';
import { EventScannerCamera } from './event-scanner-camera';
import { validateScannedPass } from './validate-scanned-pass';

type ScannerState =
  | { status: 'idle' }
  | { status: 'validating' }
  | { status: 'valid'; attendance: EventAttendanceResult }
  | { status: 'error'; message: string; code?: string };

const INVALID_PASS_CODES = new Set([
  'PASS_NOT_FOUND', 'PASS_EVENT_MISMATCH', 'PASS_INACTIVE', 'PASS_EXPIRED', 'ATTENDANCE_NOT_ALLOWED',
]);

export function EventPassScanner({ eventId }: { eventId: string }) {
  const request = useRef<AbortController | null>(null);
  const [state, setState] = useState<ScannerState>({ status: 'idle' });
  const pending = state.status === 'validating';
  const duplicate = state.status === 'valid' && state.attendance.code === 'ATTENDANCE_ALREADY_RECORDED';
  const rejectedPass = state.status === 'error' && INVALID_PASS_CODES.has(state.code ?? '');
  const showSideAction = duplicate || rejectedPass;
  const [cameraActions, setCameraActions] = useState<HTMLDivElement | null>(null);

  useEffect(() => () => { request.current?.abort(); }, []);

  const onRead = useCallback((qrToken: string) => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setState({ status: 'validating' });
    void validateScannedPass(eventId, qrToken, controller.signal)
      .then((attendance) => {
        if (!controller.signal.aborted) setState({ status: 'valid', attendance });
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          const knownRejection =
            (reason instanceof ApiClientError && reason.status < 500) ||
            reason instanceof SessionError;
          setState({
            status: 'error',
            code: reason instanceof ApiClientError ? reason.code : undefined,
            message: knownRejection
              ? reason.message
              : 'No se pudo confirmar la asistencia. Comprueba la conexión y vuelve a escanear el pase para verificar su estado.',
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
    <div className={`event-scanner-layout${showSideAction ? ' event-scanner-feedback' : ''}`}>
      <EventScannerCamera
        onRead={onRead}
        disabled={pending}
        startLabel={state.status === 'valid' || state.status === 'error' ? 'Escanear otro pase' : 'Activar cámara'}
        onStart={() => setState({ status: 'idle' })}
        actionContainer={showSideAction ? cameraActions : null}
        inactiveMessage={showSideAction ? 'Lectura completada' : undefined}
      />
      <aside className="event-scanner-instructions" aria-labelledby="scanner-instructions" aria-busy={pending}>
        <h2 id="scanner-instructions">
          {pending ? 'Validando el pase' : rejectedPass ? 'Pase no válido' : state.status === 'valid'
            ? state.attendance.code === 'ATTENDANCE_RECORDED' ? 'Asistencia registrada' : 'Asistencia ya registrada'
            : state.status === 'error' ? 'No se pudo validar el pase' : 'Cómo escanear'}
        </h2>
        {showSideAction ? (
          <p className="event-scanner-description">
            {duplicate
              ? 'Este pase ya se usó para registrar asistencia. No necesitas volver a registrarlo.'
              : 'Comprueba que el código sea válido y pertenezca al evento que estás revisando.'}
          </p>
        ) : null}
        {pending ? (
          <div className="event-scanner-result" role="status">
            <strong>Comprobando pase</strong>
            <p>Verificación de inscripción y vigencia en curso.</p>
          </div>
        ) : state.status === 'valid' ? (
          <div className="event-scanner-result" role="status">
            {duplicate ? (
              <>
                <strong>Ya tiene asistencia</strong>
                <p>No se creó un segundo registro.</p>
              </>
            ) : (
              <>
                <strong>{state.attendance.participantName}</strong>
                <p>{state.attendance.eventTitle}</p>
                <p>Ingreso registrado el {formatEventDateTime(state.attendance.attendedAt)}</p>
              </>
            )}
          </div>
        ) : state.status === 'error' ? (
          <div className="event-scanner-result" role="alert">
            {rejectedPass ? <strong>QR rechazado</strong> : null}
            <p>{state.message}</p>
          </div>
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
              setState({
                status: 'error',
                message: 'Se canceló la espera. La asistencia puede haberse registrado. Vuelve a escanear el pase para comprobarlo.',
              });
            }}
          >
            Cancelar validación
          </button>
        ) : null}
        <div className={`event-scanner-panel-actions${showSideAction ? ' has-camera-action' : ''}`}>
          <Link href={`/events/${eventId}/participants`} className="event-button event-button-secondary">Participantes</Link>
          {showSideAction ? <div ref={setCameraActions} /> : null}
        </div>
      </aside>
    </div>
  );
}
