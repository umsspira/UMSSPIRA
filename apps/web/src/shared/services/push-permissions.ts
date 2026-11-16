import type {
  PushPermissionState,
  PushUnsupportedReason,
} from '@umsspira/shared-types';

/** Resultado de comprobar si el navegador puede gestionar notificaciones Push. */
export type PushSupport =
  | { supported: true }
  | { supported: false; reason: PushUnsupportedReason };

const isBrowser = (): boolean => typeof window !== 'undefined';

/**
 * Comprueba si el entorno actual puede gestionar notificaciones Push.
 * Revisa contexto seguro (HTTPS/localhost), API de notificaciones,
 * Service Worker y Push API.
 */
export function detectPushSupport(): PushSupport {
  if (!isBrowser()) {
    return { supported: false, reason: 'no-notification-api' };
  }

  const hasNotification = typeof window.Notification !== 'undefined';

  if (!hasNotification) {
    // `window.isSecureContext` es false en http:// salvo localhost.
    if (!window.isSecureContext) {
      return { supported: false, reason: 'insecure-context' };
    }
    return { supported: false, reason: 'no-notification-api' };
  }

  if (!window.isSecureContext) {
    return { supported: false, reason: 'insecure-context' };
  }

  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return { supported: false, reason: 'no-service-worker' };
  }

  if (!('PushManager' in window)) {
    return { supported: false, reason: 'no-push-manager' };
  }

  return { supported: true };
}

/** Devuelve el estado actual del permiso de notificaciones. */
export function getPushPermission(): PushPermissionState {
  if (!isBrowser() || typeof window.Notification === 'undefined') {
    return 'default';
  }
  return window.Notification.permission as PushPermissionState;
}

/**
 * Solicita el permiso de notificaciones al usuario.
 * Si el navegador no soporta Push, devuelve el estado actual sin solicitar nada.
 */
export async function requestPushPermission(): Promise<PushPermissionState> {
  if (!detectPushSupport().supported) {
    return getPushPermission();
  }

  if (window.Notification.permission !== 'default') {
    return window.Notification.permission as PushPermissionState;
  }

  try {
    const result = await window.Notification.requestPermission();
    return result as PushPermissionState;
  } catch {
    return getPushPermission();
  }
}


export function describeUnsupportedReason(reason: PushUnsupportedReason): string {
  switch (reason) {
    case 'insecure-context':
      return 'Las notificaciones requieren una conexión segura (HTTPS).';
    case 'no-notification-api':
      return 'Este dispositivo no admite notificaciones del navegador.';
    case 'no-service-worker':
      return 'El navegador no admite Service Workers.';
    case 'no-push-manager':
      return 'Este navegador no permite recibir notificaciones Push.';
    default:
      return 'No es posible gestionar notificaciones en este dispositivo.';
  }
}
