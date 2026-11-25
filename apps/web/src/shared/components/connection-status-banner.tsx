'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { CheckCircle2, WifiOff } from 'lucide-react';
import { useRealConnection } from '@/shared/hooks/use-real-connection';
import { useConnectionMode } from '@/shared/hooks/use-connection-mode';

/** HU05 CA-03: «Conexión restablecida» se ve unos segundos. */
export const RESTORED_VISIBLE_MS = 4000;

/** El inicio del portal ya muestra su propio aviso sin conexión: aquí no se repite. */
const PATHS_WITH_OWN_NOTICE = ['/portal'];

/**
 * HU05: indicador global de conexión en cualquier pantalla.
 * - Sin conexión: «Estás navegando sin conexión» (CA-02).
 * - Al volver la red: desaparece y aparece «Conexión restablecida» unos segundos (CA-03).
 * - Se actualiza solo con los eventos online/offline, sin recargar (CA-04), y no bloquea nada (CA-05).
 */
export function ConnectionStatusBanner() {
  const pathname = usePathname();
  const isOnline = useRealConnection();
  const modo = useConnectionMode();
  const [restored, setRestored] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      setRestored(false);
      return;
    }
    if (!wasOffline.current) return;
    wasOffline.current = false;
    setRestored(true);
    const timeoutId = window.setTimeout(() => setRestored(false), RESTORED_VISIBLE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [isOnline]);

  if (PATHS_WITH_OWN_NOTICE.includes(pathname ?? '')) return null;
  if (isOnline && !restored) return null;

  const offline = !isOnline;
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="connection-status-banner"
      data-estado={offline ? 'sin-conexion' : 'restablecida'}
      data-tipo={offline ? modo : 'en-linea'}
      className={`pointer-events-none fixed bottom-4 left-4 z-[65] flex max-w-[calc(100%-6rem)] items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-lg sm:bottom-6 sm:left-6 ${
        offline ? 'bg-[#B44735] text-white' : 'bg-green-700 text-white'
      }`}
    >
      {offline ? <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />}
      <span>{offline ? (modo === 'modo-avion' ? 'Modo avión' : 'Sin señal') : 'En línea'}</span>
    </div>
  );
}
