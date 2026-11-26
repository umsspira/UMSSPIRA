'use client';

import { ActionNotice } from '@/shared/components/action-notice';
import { OFFLINE_PASS_INVALID_MESSAGE } from './offline-sync';
import { useOfflineSync } from './use-offline-sync';

function formatLastUpdate(value: string | null): string {
  if (!value) return 'sin registro';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'sin registro';

  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/La_Paz',
  }).format(date);
}

/**
 * HU03 CA-05 y CA-06: muestra dentro de la página el resultado de la
 * sincronización y la fecha de la última actualización (sin notificación push).
 */
export function OfflineSyncStatus() {
  const { isOnline, state, result, lastUpdate, hasSavedData, retry } =
    useOfflineSync();

  if (!hasSavedData && state === 'idle') return null;

  const lastUpdateText = `Última actualización: ${formatLastUpdate(lastUpdate)}`;
  const boxClass =
    'mx-auto mb-6 w-full max-w-4xl rounded-xl border border-oatmeal bg-white p-4 font-sans text-[14px] text-abyssal-blue';

  // HU10: carga y error usan el componente único de avisos.
  if (state === 'syncing') {
    return (
      <ActionNotice
        state="loading"
        message="Actualizando tus pases guardados…"
        className="mx-auto mb-6 max-w-4xl"
      />
    );
  }

  if (state === 'error') {
    return (
      <ActionNotice
        state="error"
        message="No se pudo actualizar"
        description={`Tus pases guardados se conservan. ${lastUpdateText}`}
        onRetry={() => void retry()}
        className="mx-auto mb-6 max-w-4xl"
      />
    );
  }

  if (!isOnline) {
    return (
      <div role="status" aria-live="polite" className={boxClass}>
        <p className="font-semibold">Sin conexión</p>
        <p className="text-[12px] text-abyssal-blue/70">{lastUpdateText}</p>
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite" className={boxClass}>
      <p className="font-semibold">
        {state === 'success' && result
          ? result.updated > 0
            ? 'Tus pases se actualizaron'
            : 'Tus pases ya estaban al día'
          : 'Pases guardados'}
      </p>
      {state === 'success' && result && result.invalidated > 0 && (
        <p className="text-[12px] text-truffle-trouble">
          {result.invalidated === 1
            ? OFFLINE_PASS_INVALID_MESSAGE
            : `${result.invalidated} pases ya no son válidos`}
        </p>
      )}
      <p className="text-[12px] text-abyssal-blue/70">{lastUpdateText}</p>
    </div>
  );
}