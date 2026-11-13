'use client';

import { useEffect, useRef, useState } from 'react';

function cameraErrorMessage(error: unknown): string {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError') return 'Permite el acceso a la cámara en tu navegador y vuelve a intentarlo.';
  if (name === 'NotFoundError') return 'No se encontró una cámara disponible.';
  if (name === 'NotReadableError') return 'No se pudo abrir la cámara. Comprueba si otra aplicación la está utilizando.';
  return 'No se pudo iniciar la cámara. Comprueba su conexión y vuelve a intentarlo.';
}

export function EventScannerCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let stream: MediaStream | undefined;
    const video = videoRef.current;
    setError(null);
    setReady(false);

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Cámara no compatible');
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
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        if (active) setReady(true);
      } catch (reason: unknown) {
        stream?.getTracks().forEach((track) => track.stop());
        if (active) {
          setError(navigator.mediaDevices?.getUserMedia
            ? cameraErrorMessage(reason)
            : 'La cámara requiere un navegador compatible y una conexión HTTPS o localhost.');
          setEnabled(false);
        }
      }
    }
    void start();
    return () => {
      active = false;
      stream?.getTracks().forEach((track) => track.stop());
      if (video) video.srcObject = null;
    };
  }, [enabled]);

  return (
    <section className="event-scanner-preview" aria-label="Vista previa del lector QR">
      <div className="event-scanner-camera-view">
        <video ref={videoRef} muted playsInline aria-label="Cámara del escáner" />
        <div className="event-scanner-frame" aria-hidden="true" />
      </div>
      <p role="status">{enabled ? ready ? 'Ubica el QR dentro del marco' : 'Abriendo cámara…' : 'Activa la cámara para leer un pase'}</p>
      {error ? <p role="alert">{error}</p> : null}
      <button
        type="button"
        className="event-button event-button-primary"
        onClick={() => { setReady(false); setEnabled((value) => !value); }}
      >
        {enabled ? 'Detener cámara' : 'Activar cámara'}
      </button>
    </section>
  );
}
