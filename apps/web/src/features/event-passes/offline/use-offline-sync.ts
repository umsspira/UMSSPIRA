'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getOfflineSessionUserId } from './offline-session';
import { getOfflineQrPasses } from './offline-qr-storage';
import {
  getOfflineDataLastUpdate,
  syncOfflineQrPasses,
  type OfflineSyncResult,
} from './offline-sync';

export type OfflineSyncState = 'idle' | 'syncing' | 'success' | 'error';

/**
 * HU03: sincroniza los pases guardados al abrir la página y cada vez que
 * vuelve la conexión, sin recargar (CA-01). Expone el resultado y la hora
 * de la última actualización para mostrarlos en pantalla (CA-05, CA-06).
 */
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [state, setState] = useState<OfflineSyncState>('idle');
  const [result, setResult] = useState<OfflineSyncResult | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [hasSavedData, setHasSavedData] = useState(false);
  const running = useRef(false);

  const refreshLastUpdate = useCallback(async () => {
    const userId = getOfflineSessionUserId();

    if (!userId) {
      setHasSavedData(false);
      setLastUpdate(null);
      return;
    }

    const passes = await getOfflineQrPasses(userId);
    setHasSavedData(passes.length > 0);
    setLastUpdate(getOfflineDataLastUpdate(passes));
  }, []);

  const sync = useCallback(async () => {
    if (running.current) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    const userId = getOfflineSessionUserId();
    if (!userId) return;

    running.current = true;
    setState('syncing');

    try {
      const syncResult = await syncOfflineQrPasses(userId);

      setResult(syncResult);
      setState(
        syncResult.total === 0
          ? 'idle'
          : syncResult.failed > 0
            ? 'error'
            : 'success'
      );
    } catch (error) {
      console.error('No se pudo sincronizar los pases guardados:', error);
      setState('error');
    } finally {
      running.current = false;
      await refreshLastUpdate().catch(() => undefined);
    }
  }, [refreshLastUpdate]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void sync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      void refreshLastUpdate().catch(() => undefined);
    };

    setIsOnline(navigator.onLine);
    void refreshLastUpdate().catch(() => undefined);

    if (navigator.onLine) void sync();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [sync, refreshLastUpdate]);

  return { isOnline, state, result, lastUpdate, hasSavedData, retry: sync };
}