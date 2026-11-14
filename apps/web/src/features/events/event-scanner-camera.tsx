'use client';

import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { createPortal } from 'react-dom';

export interface CameraFailure {
  kind: 'permission-denied' | 'unavailable';
  message: string;
}

function cameraErrorMessage(error: unknown): string {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError') return 'Permite el acceso a la cámara en tu navegador y vuelve a intentarlo.';
  if (name === 'NotFoundError') return 'No se encontró una cámara disponible.';
  if (name === 'NotReadableError') return 'No se pudo abrir la cámara. Comprueba si otra aplicación la está utilizando.';
  return 'No se pudo iniciar la cámara. Comprueba su conexión y vuelve a intentarlo.';
}

export function EventScannerCamera({
  onRead, onStart, onError, startLabel = 'Activar cámara', disabled = false,
  actionContainer = null, inactiveMessage = 'Activa la cámara para leer un pase',
}: {
  onRead?: (token: string) => void;
  onStart?: () => void;
  onError?: (failure: CameraFailure) => void;
  startLabel?: string;
  disabled?: boolean;
  actionContainer?: HTMLElement | null;
  inactiveMessage?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || disabled) return;
    let active = true;
    let stream: MediaStream | undefined;
    const video = videoRef.current;
    const cameraSupported = typeof navigator.mediaDevices?.getUserMedia === 'function';
    let timer: ReturnType<typeof setTimeout> | undefined;
    const canvas = document.createElement('canvas');
    let context: CanvasRenderingContext2D | null = null;
    setError(null);
    setReady(false);

    function fail(message: string, kind: CameraFailure['kind'] = 'unavailable') {
      if (!active) return;
      active = false;
      clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
      setReady(false);
      setEnabled(false);
      if (onError) {
        setError(null);
        onError({ kind, message });
      } else {
        setError(message);
      }
    }

    function cameraEnded() {
      fail('Se interrumpió la cámara. Comprueba su conexión y vuelve a activarla.');
    }

    function scan() {
      if (!active || !video) return;
      try {
        if (context && video.readyState >= 2 && video.videoWidth > 0) {
          const scale = Math.min(1, 960 / video.videoWidth);
          canvas.width = Math.round(video.videoWidth * scale);
          canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(pixels.data, pixels.width, pixels.height);
          if (code?.data) {
            setReady(false);
            setEnabled(false);
            onRead?.(code.data);
            return;
          }
        }
        timer = setTimeout(scan, 200);
      } catch {
        fail('No se pudo procesar la imagen de la cámara. Vuelve a activarla para reintentar.');
      }
    }

    async function start() {
      try {
        if (!cameraSupported) {
          throw new Error('Cámara no compatible');
        }
        if (onRead) {
          context = canvas.getContext('2d', { willReadFrequently: true });
          if (!context) {
            fail('El navegador no permite procesar imágenes para leer el QR.');
            return;
          }
        }
        const acquired = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' } },
        });
        if (!active) {
          acquired.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = acquired;
        stream.getTracks().forEach((track) => track.addEventListener('ended', cameraEnded));
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        if (active) {
          setReady(true);
          if (onRead) timer = setTimeout(scan, 200);
        }
      } catch (reason: unknown) {
        fail(
          cameraSupported
            ? cameraErrorMessage(reason)
            : 'La cámara requiere un navegador compatible y una conexión HTTPS o localhost.',
          reason instanceof Error && reason.name === 'NotAllowedError' ? 'permission-denied' : 'unavailable',
        );
      }
    }
    void start();
    return () => {
      active = false;
      clearTimeout(timer);
      stream?.getTracks().forEach((track) => {
        track.removeEventListener('ended', cameraEnded);
        track.stop();
      });
      if (video) video.srcObject = null;
    };
  }, [enabled, disabled, onRead, onError]);

  const cameraAction = (
    <button
        type="button"
        disabled={disabled}
        className="event-button event-button-primary"
        onClick={() => {
          if (!enabled) onStart?.();
          setReady(false);
          setEnabled((value) => !value);
        }}
      >
        {startLabel}
    </button>
  );

  return (
    <section className="event-scanner-preview" aria-label="Vista previa del lector QR">
      <div className="event-scanner-camera-view">
        <video ref={videoRef} muted playsInline aria-label="Cámara del escáner" />
        <div className="event-scanner-frame" aria-hidden="true" />
      </div>
      <p role="status">{enabled ? ready ? 'Ubica el QR dentro del marco' : 'Abriendo cámara…' : inactiveMessage}</p>
      {error ? <p role="alert">{error}</p> : null}
      {!enabled && !disabled ? (actionContainer ? createPortal(cameraAction, actionContainer) : cameraAction) : null}
    </section>
  );
}
