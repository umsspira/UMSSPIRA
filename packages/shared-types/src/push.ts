/**
 * Tipos compartidos para las notificaciones Push (HU13).
 * Se consumen tanto en el frontend (permisos y suscripción) como en la API.
 */

/** Estado del permiso de notificaciones tal como lo expone el navegador. */
export const PUSH_PERMISSION_STATES = ['default', 'granted', 'denied'] as const;
export type PushPermissionState = (typeof PUSH_PERMISSION_STATES)[number];

/** Motivo por el que el navegador no puede gestionar notificaciones Push. */
export const PUSH_UNSUPPORTED_REASONS = [
  'insecure-context',
  'no-notification-api',
  'no-service-worker',
  'no-push-manager',
] as const;
export type PushUnsupportedReason = (typeof PUSH_UNSUPPORTED_REASONS)[number];

/** Clave pública VAPID (base64url) que entrega la API para suscribir el navegador. */
export interface PushPublicKeyDto {
  publicKey: string;
}

/** Datos que el cliente envía al registrar o actualizar su suscripción Push. */
export interface PushSubscriptionInputDto {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  navegador?: string;
  plataforma?: string;
}

/** Suscripción Push tal como la devuelve la API. */
export interface PushSubscriptionDto {
  id: string;
  userId: string;
  endpoint: string;
  navegador: string | null;
  plataforma: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
