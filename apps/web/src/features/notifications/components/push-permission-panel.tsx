'use client';

import { Bell, BellRing, BellOff, ShieldAlert } from 'lucide-react';
import {
  describeUnsupportedReason,
} from '@/shared/services/push-permissions';
import { usePushPermission } from '../hooks/usePushPermission';

/**
 * Panel de estado y activación de notificaciones Push (HU13 - T7).
 * Se muestra dentro del desplegable de notificaciones del navbar,
 * respetando la tipografía y colores existentes (ámbar #FFB162 sobre #0F172A).
 */
export function PushPermissionPanel() {
  const { permission, support, requesting, request } = usePushPermission();

  if (!support.supported) {
    return (
      <div className="flex items-start gap-2 text-xs text-slate-500">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        <p>{describeUnsupportedReason(support.reason)}</p>
      </div>
    );
  }

  if (permission === 'granted') {
    return (
      <div className="flex items-center gap-2 text-xs font-semibold text-[#237044]">
        <BellRing className="h-4 w-4 shrink-0" aria-hidden="true" />
        <p>Notificaciones Push activadas en este dispositivo.</p>
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

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2 text-xs text-slate-600">
        <Bell className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
        <p>Activa las notificaciones para enterarte de cambios y cancelaciones de eventos.</p>
      </div>
      <button
        type="button"
        onClick={() => void request()}
        disabled={requesting}
        className="w-full rounded-xl bg-[#FFB162] px-3 py-2 text-xs font-bold text-[#0F172A] transition-colors hover:bg-[#e99541] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {requesting ? 'Solicitando permiso…' : 'Activar notificaciones'}
      </button>
    </div>
  );
}
