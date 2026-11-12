// apps/web/src/features/notifications/hooks/usePushPermission.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PushPermissionState } from '@umsspira/shared-types';
import {
  detectPushSupport,
  getPushPermission,
  requestPushPermission,
  type PushSupport,
} from '@/shared/services/push-permissions';

export interface PushPermissionController {
  permission: PushPermissionState;
  support: PushSupport;
  /** true mientras se está solicitando permiso al navegador. */
  requesting: boolean;
  /** Pide permiso y devuelve el estado resultante. */
  request: () => Promise<PushPermissionState>;
}

/**
 * Gestiona el estado del permiso de notificaciones Push del navegador.
 * Mantiene el estado sincronizado si el usuario lo cambia desde la configuración del navegador.
 */
export function usePushPermission(): PushPermissionController {
  const [permission, setPermission] = useState<PushPermissionState>('default');
  const [support, setSupport] = useState<PushSupport>({ supported: true });
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    setSupport(detectPushSupport());
    setPermission(getPushPermission());
  }, []);

  const request = useCallback(async () => {
    setRequesting(true);
    try {
      const result = await requestPushPermission();
      setPermission(result);
      return result;
    } finally {
      setRequesting(false);
    }
  }, []);

  return { permission, support, requesting, request };
}
