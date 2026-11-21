'use client';

import { useEffect, useState } from 'react';
import { registerServiceWorker } from './register-sw';
import { ActionNotice } from '@/shared/components/action-notice';

type UpdatePhase = 'idle' | 'loading' | 'error';

export default function ServiceWorkerRegister() {
  const [apply, setApply] = useState<(() => void) | null>(null);
  const [phase, setPhase] = useState<UpdatePhase>('idle');

  useEffect(() => {
    registerServiceWorker((applyUpdate) => setApply(() => applyUpdate));
  }, []);

  // HU10: si la nueva versión no se activa a tiempo se avisa con «Reintentar».
  useEffect(() => {
    if (phase !== 'loading') return;
    const timeoutId = setTimeout(() => setPhase('error'), 10000);
    return () => clearTimeout(timeoutId);
  }, [phase]);

  if (!apply) return null;

  const handleApply = () => {
    if (phase === 'loading') return;
    setPhase('loading');
    apply();
  };

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 shadow-lg">
      {phase === 'idle' && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl bg-slate-900 p-4 text-white"
        >
          <span className="text-sm">Hay una versión nueva disponible.</span>
          <button
            onClick={handleApply}
            className="min-h-[44px] rounded-lg bg-amber-500 px-4 text-sm font-semibold text-slate-900"
          >
            Actualizar
          </button>
        </div>
      )}

      {phase === 'loading' && (
        <ActionNotice state="loading" message="Actualizando la aplicación…" />
      )}

      {phase === 'error' && (
        <ActionNotice
          state="error"
          message="No se pudo actualizar la aplicación"
          description="Inténtalo nuevamente."
          onRetry={handleApply}
        />
      )}
    </div>
  );
}