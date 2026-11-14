
'use client';

import { useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '@/shared/hooks/use-online-status';

interface MessagesOfflineGuardProps {
  children: React.ReactNode;
}

export function MessagesOfflineGuard({
  children,
}: MessagesOfflineGuardProps) {
  const isOnline = useOnlineStatus();
  const [mensaje, setMensaje] = useState('');

  const handleRetry = () => {
    if (!navigator.onLine) {
      setMensaje(
        'Sigues sin conexión. Comprueba tu Internet e inténtalo nuevamente.'
      );
      return;
    }

    // No recargamos la página.
    // El hook detecta la reconexión automáticamente.
    setMensaje('');
  };

  if (!isOnline) {
    return (
      <main className="mx-auto flex min-h-[65vh] max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="rounded-full bg-amber-100 p-5">
          <WifiOff
            className="h-14 w-14 text-amber-600"
            aria-hidden="true"
          />
        </div>

        <h1 className="text-2xl font-bold text-slate-900">
          Mensajes no disponibles sin conexión
        </h1>

        <p className="max-w-md text-slate-600">
          Necesitas conexión a Internet para acceder a los mensajes.
          Las conversaciones y el envío de mensajes no están
          disponibles mientras estés desconectado.
        </p>

        <button
          type="button"
          onClick={handleRetry}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white transition-colors hover:bg-slate-800"
        >
          <RefreshCw className="h-4 w-4" />
          Reintentar conexión
        </button>

        {mensaje && (
          <p
            role="status"
            className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            {mensaje}
          </p>
        )}
      </main>
    );
  }

  return <>{children}</>;
}
