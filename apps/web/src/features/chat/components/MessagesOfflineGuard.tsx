
'use client';

import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/shared/hooks/use-online-status';

interface MessagesOfflineGuardProps {
  children: React.ReactNode;
}

export function MessagesOfflineGuard({
  children,
}: MessagesOfflineGuardProps) {
  const isOnline = useOnlineStatus();

  if (!isOnline) {
    return (
      <main className="mx-auto flex min-h-[65vh] max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
        <WifiOff
          className="h-14 w-14 text-amber-600"
          aria-hidden="true"
        />

        <h1 className="text-2xl font-bold text-slate-900">
          Mensajes no disponibles sin conexión
        </h1>

        <p className="max-w-md text-slate-600" role="status">
          Necesitas conexión a Internet para acceder a los mensajes.
          Las conversaciones y el envío de mensajes no están
          disponibles mientras estés desconectado.
        </p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white hover:bg-slate-800"
        >
          Reintentar
        </button>
      </main>
    );
  }

  return <>{children}</>;
}

