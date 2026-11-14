// apps/web/src/features/notifications/hooks/usePushSubscription.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PushPermissionState, PushSubscriptionDto } from '@umsspira/shared-types';
import {
  getVapidPublicKey,
  listPushSubscriptions,
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

function registrationCoversCurrentPage(registration: ServiceWorkerRegistration): boolean {
  const scope = new URL(registration.scope).pathname;
  return window.location.pathname.startsWith(scope);
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Este navegador no tiene un Service Worker disponible.');
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  const registration = registrations.find(registrationCoversCurrentPage);
  if (!registration) {
    throw new Error('El Service Worker no está registrado para esta página.');
  }

  const active = registration.active ?? (await navigator.serviceWorker.ready).active;
  if (!active) {
    throw new Error('El Service Worker todavía no está activo. Inténtalo de nuevo en unos segundos.');
  }
  if (!('pushManager' in registration)) {
    throw new Error('Este navegador no permite recibir notificaciones Push.');
  }
  return registration;
}

/**
 * Gestiona el registro, actualización y eliminación de la suscripción Push
 * del Titulado (HU13 - T8).
 */
export function usePushSubscription(permission: PushPermissionState): PushSubscriptionController {
  const [status, setStatus] = useState<SubscriptionStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const reconcile = useCallback(async () => {
    if (permission !== 'granted') {
      if (permission === 'denied') {
        try {
          const registration = await getRegistration();
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            await removePushSubscription(subscription.endpoint);
            await subscription.unsubscribe();
          }
        } catch {
          // No se elimina información de otros dispositivos cuando no se puede identificar este endpoint.
        }
      }
      setStatus('idle');
      return;
    }

    try {
      const registration = await getRegistration();
      const local = await registration.pushManager.getSubscription();
      const registered = await listPushSubscriptions();

      if (!local) {
        setStatus('idle');
        return;
      }

      if (registered.some((subscription) => subscription.endpoint === local.endpoint)) {
        setStatus('subscribed');
        return;
      }

      await savePushSubscription(toSubscriptionInput(local));
      setStatus('subscribed');
    } catch (cause) {
      setStatus('error');
      setError(
        cause instanceof Error
          ? cause.message
          : 'No fue posible comprobar el estado de las notificaciones.',
      );
    }
  }, [permission]);

  useEffect(() => {
    void reconcile();
  }, [reconcile]);

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
      const created = !existing;
      const subscription = existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        }));

      let saved: PushSubscriptionDto;
      try {
        saved = await savePushSubscription(toSubscriptionInput(subscription));
      } catch (error) {
        if (created) {
          await subscription.unsubscribe().catch(() => undefined);
        }
        throw error;
      }
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
        await removePushSubscription(subscription.endpoint);
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

