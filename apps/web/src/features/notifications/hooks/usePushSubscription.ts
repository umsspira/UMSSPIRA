// apps/web/src/features/notifications/hooks/usePushSubscription.ts
'use client';

import { useCallback, useState } from 'react';
import type { PushSubscriptionDto } from '@umsspira/shared-types';
import {
  getVapidPublicKey,
  removePushSubscription,
  savePushSubscription,
  toSubscriptionInput,
  urlBase64ToUint8Array,
} from '@/shared/services/push-subscription';

export type SubscriptionStatus = 'idle' | 'subscribing' | 'subscribed' | 'error';

export interface PushSubscriptionController {
  status: SubscriptionStatus;
  error: string | null;
  /** Obtiene (o crea) la suscripción del navegador y la registra en la API. */
  subscribe: () => Promise<PushSubscriptionDto | null>;
  /** Elimina la suscripción local y en la API. */
  unsubscribe: () => Promise<void>;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.ready;
}

/**
 * Gestiona el registro, actualización y eliminación de la suscripción Push
 * del Titulado (HU13 - T8).
 */
export function usePushSubscription(): PushSubscriptionController {
  const [status, setStatus] = useState<SubscriptionStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const subscribe = useCallback(async (): Promise<PushSubscriptionDto | null> => {
    setStatus('subscribing');
    setError(null);
    try {
      const publicKey = getVapidPublicKey();
      if (!publicKey) {
        throw new Error(
          'Falta la clave pública VAPID del servidor; no es posible suscribir notificaciones.',
        );
      }

      const registration = await getRegistration();
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        }));

      const saved = await savePushSubscription(toSubscriptionInput(subscription));
      setStatus('subscribed');
      return saved;
    } catch (cause) {
      setStatus('error');
      setError(
        cause instanceof Error
          ? cause.message
          : 'No fue posible activar las notificaciones.',
      );
      return null;
    }
  }, []);

  const unsubscribe = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      const registration = await getRegistration();
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscription(subscription.endpoint).catch(() => undefined);
        await subscription.unsubscribe();
      }
      setStatus('idle');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No fue posible desactivar las notificaciones.',
      );
    }
  }, []);

  return { status, error, subscribe, unsubscribe };
}

