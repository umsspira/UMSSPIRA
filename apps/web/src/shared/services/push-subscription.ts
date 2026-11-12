import type {
  PushSubscriptionDto,
  PushSubscriptionInputDto,
} from '@umsspira/shared-types';

import { apiClient } from './api-client';

const PUSH_SUBSCRIPTIONS_PATH = '/api/v1/push-subscriptions';

/** Convierte una clave VAPID base64url en el Uint8Array que exige subscribe(). */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

/** Clave pública VAPID configurada para el frontend. */
export function getVapidPublicKey(): string {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
  return key.trim();
}

function detectNavegador(): string | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\//.test(ua)) return 'Opera';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return undefined;
}

function detectPlataforma(): string | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const ua = navigator.userAgent;
  if (/Android/.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac OS X/.test(ua)) return 'macOS';
  if (/Linux/.test(ua)) return 'Linux';
  return undefined;
}

/** Convierte una PushSubscription del navegador al DTO que espera la API. */
export function toSubscriptionInput(
  subscription: PushSubscription,
): PushSubscriptionInputDto {
  const json = subscription.toJSON();
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: json.keys?.p256dh ?? '',
      auth: json.keys?.auth ?? '',
    },
    navegador: detectNavegador(),
    plataforma: detectPlataforma(),
  };
}

/** Registra (o actualiza) la suscripción en la API. */
export async function savePushSubscription(
  input: PushSubscriptionInputDto,
): Promise<PushSubscriptionDto> {
  const result = await apiClient<{ data: PushSubscriptionDto }>(
    PUSH_SUBSCRIPTIONS_PATH,
    { method: 'POST', body: input, authenticated: true },
  );
  return result.data;
}

/** Elimina la suscripción de la API por su endpoint. */
export async function removePushSubscription(
  endpoint: string,
): Promise<void> {
  await apiClient(PUSH_SUBSCRIPTIONS_PATH, {
    method: 'DELETE',
    body: { endpoint },
    authenticated: true,
  });
}
