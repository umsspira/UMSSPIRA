// apps/web/src/features/notifications/hooks/usePushSubscription.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PushPermissionState, PushSubscriptionDto } from '@umsspira/shared-types';
import {
  getVapidPublicKey,
  listPushSubscriptions,
  pushSubscriptionErrorMessage,
  removePushSubscription,
  savePushSubscription,
  toSubscriptionInput,
  urlBase64ToUint8Array,
} from '@/shared/services/push-subscription';

export type SubscriptionStatus = 'idle' | 'checking' | 'subscribing' | 'subscribed' | 'error';

export interface PushSubscriptionController {
  status: SubscriptionStatus;
  error: string | null;
  /** Obtiene (o crea) la suscripción del navegador y la registra en la API. */
  subscribe: () => Promise<PushSubscriptionDto | null>;
  /** Elimina la suscripción local y en la API. */
  unsubscribe: () => Promise<void>;
}

function registrationCoversCurrentPage(registration: ServiceWorkerRegistration): boolean {
  try {
    const scope = new URL(registration.scope, window.location.origin).pathname;
    const normalizedScope = scope.endsWith('/') && scope.length > 1 ? scope.slice(0, -1) : scope;
    const path = window.location.pathname;
    return path === normalizedScope || path.startsWith(`${normalizedScope}/`);
  } catch {
    return false;
  }
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    throw new Error('Este navegador no tiene un Service Worker disponible.');
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  let registration =
    registrations.find(registrationCoversCurrentPage) ??
    registrations.find((item) => 'pushManager' in item);

  if (!registration) {
    try {
      registration =
        (await navigator.serviceWorker.getRegistration('/portal')) ??
        (await navigator.serviceWorker.register('/sw.js', { scope: '/portal' }));
    } catch {
      // Ignorar fallback si falla el registro en entornos restringidos
    }
  }

  if (!registration) {
    throw new Error('El Service Worker no está registrado para esta página.');
  }

  if (!('pushManager' in registration)) {
    throw new Error('Este navegador no permite recibir notificaciones Push.');
  }

  let active = registration.active;
  if (!active && 'ready' in navigator.serviceWorker) {
    try {
      const readyReg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000)),
      ]);
      if (readyReg?.active) {
        active = readyReg.active;
      }
    } catch {
      // Continuar con la comprobación de estado de instalación
    }
  }

  if (!active && !registration.waiting && !registration.installing) {
    throw new Error('El Service Worker todavía no está activo. Inténtalo de nuevo en unos segundos.');
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
  const operationId = useRef(0);
  const explicitOperation = useRef(false);

  const reconcile = useCallback(async () => {
    if (explicitOperation.current) return;
    const operation = ++operationId.current;
    const isCurrent = () => operation === operationId.current && !explicitOperation.current;

    if (permission !== 'granted') {
      if (permission === 'denied') {
        try {
          const registration = await getRegistration();
          const subscription = await registration.pushManager.getSubscription();
          if (subscription && isCurrent()) {
            await removePushSubscription(subscription.endpoint);
            if (!isCurrent()) return;
            await subscription.unsubscribe();
          }
        } catch {
          // No se elimina información de otros dispositivos cuando no se puede identificar este endpoint.
        }
      }
      if (isCurrent()) setStatus((current) => (current === 'idle' ? current : 'idle'));
      return;
    }

    try {
      setStatus('checking');
      setError(null);
      const registration = await getRegistration();
      if (!isCurrent()) return;
      const local = await registration.pushManager.getSubscription();
      if (!isCurrent()) return;
      const registered = await listPushSubscriptions();
      if (!isCurrent()) return;

      if (!local) {
        setStatus('idle');
        return;
      }

      if (registered.some((subscription) => subscription.endpoint === local.endpoint)) {
        setStatus('subscribed');
        return;
      }

      await savePushSubscription(toSubscriptionInput(local));
      if (isCurrent()) setStatus('subscribed');
    } catch (cause) {
      if (!isCurrent()) return;
      setStatus((current) => (current === 'error' ? current : 'error'));
      setError(pushSubscriptionErrorMessage(cause, 'No fue posible comprobar el estado de las notificaciones.'));
    }
  }, [permission]);

  useEffect(() => {
    void reconcile();
    if (permission !== 'granted' || typeof window === 'undefined') return;
    const refresh = () => void reconcile();
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
    };
  }, [reconcile, permission]);

  const subscribe = useCallback(async (): Promise<PushSubscriptionDto | null> => {
    const operation = ++operationId.current;
    explicitOperation.current = true;
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
      if (operation === operationId.current) setStatus('subscribed');
      return saved;
    } catch (cause) {
      if (operation === operationId.current) {
        setStatus('error');
        setError(pushSubscriptionErrorMessage(cause, 'No fue posible activar las notificaciones.'));
      }
      return null;
    } finally {
      if (operation === operationId.current) explicitOperation.current = false;
    }
  }, []);

  const unsubscribe = useCallback(async (): Promise<void> => {
    const operation = ++operationId.current;
    explicitOperation.current = true;
    setError(null);
    try {
      const registration = await getRegistration();
      if (operation !== operationId.current) return;
      const subscription = await registration.pushManager.getSubscription();
      if (operation !== operationId.current) return;
      if (subscription) {
        await removePushSubscription(subscription.endpoint);
        if (operation !== operationId.current) return;
        await subscription.unsubscribe();
      }
      if (operation === operationId.current) setStatus('idle');
    } catch (cause) {
      if (operation === operationId.current) {
        setError(pushSubscriptionErrorMessage(cause, 'No fue posible desactivar las notificaciones.'));
      }
    } finally {
      if (operation === operationId.current) explicitOperation.current = false;
    }
  }, []);

  return { status, error, subscribe, unsubscribe };
}

