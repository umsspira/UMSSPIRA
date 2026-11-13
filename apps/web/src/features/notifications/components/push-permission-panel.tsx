'use client';

import { Bell, BellRing, BellOff, ShieldAlert } from 'lucide-react';
import {
  describeUnsupportedReason,
} from '@/shared/services/push-permissions';
import { usePushPermission } from '../hooks/usePushPermission';
import { usePushSubscription } from '../hooks/usePushSubscription';

/**
 * Panel de estado y activación de notificaciones Push (HU13 - T7 y T8).
 * Se muestra dentro del desplegable de notificaciones del navbar,
 * respetando la tipografía y colores existentes (ámbar #FFB162 sobre #0F172A).
 */
export function PushPermissionPanel() {
  const { permission, support, requesting, request } = usePushPermission();
  const { status, error, subscribe, unsubscribe } = usePushSubscription(permission);

  if (!support.supported) {
    return (
      <div className="flex items-start gap-2 text-xs text-slate-500">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        <p>{describeUnsupportedReason(support.reason)}</p>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="flex items-start gap-2 text-xs text-slate-500">
        <BellOff className="mt-0.5 h-4 w-4 shrink-0 text-[#b06c30]" aria-hidden="true" />
        <p>
          Bloqueaste las notificaciones. Habilítalas desde la configuración de tu
          navegador para recibir avisos de eventos.
        </p>
      </div>
    );
  }

  const busy = requesting || status === 'subscribing';
  const subscribed = permission === 'granted' && status === 'subscribed';

  const handleActivate = async () => {
    const result = permission === 'granted' ? permission : await request();
    if (result === 'granted') {
      await subscribe();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2 text-xs text-slate-600">
        {subscribed ? (
          <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-[#237044]" aria-hidden="true" />
        ) : (
          <Bell className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
        )}
        <p>
          {subscribed
            ? 'Recibirás avisos de cambios y cancelaciones de tus eventos.'
            : 'Activa las notificaciones para enterarte de cambios y cancelaciones de eventos.'}
        </p>
      </div>

      {error && (
        <p role="alert" className="text-xs font-medium text-[#8B0000]">
          {error}
        </p>
      )}

      {subscribed ? (
        <button
          type="button"
          onClick={() => void unsubscribe()}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
        >
          Desactivar notificaciones
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void handleActivate()}
          disabled={busy}
          className="w-full rounded-xl bg-[#FFB162] px-3 py-2 text-xs font-bold text-[#0F172A] transition-colors hover:bg-[#e99541] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? 'Activando notificaciones…' : 'Activar notificaciones'}
        </button>
      )}
    </div>
  );
}
