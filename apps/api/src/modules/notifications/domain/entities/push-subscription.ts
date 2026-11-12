import type { PushSubscriptionDto } from '@umsspira/shared-types';

/** Suscripción Push persistida, ligada a un usuario (Titulado). */
export interface StoredPushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  navegador: string | null;
  plataforma: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

/** Datos necesarios para registrar una suscripción. */
export interface RegisterPushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
  navegador?: string | null;
  plataforma?: string | null;
}

/** Presenta una suscripción almacenada como DTO público. */
export function presentPushSubscription(
  subscription: StoredPushSubscription,
): PushSubscriptionDto {
  return {
    id: subscription.id,
    userId: subscription.userId,
    endpoint: subscription.endpoint,
    navegador: subscription.navegador,
    plataforma: subscription.plataforma,
    createdAt: subscription.createdAt ? subscription.createdAt.toISOString() : null,
    updatedAt: subscription.updatedAt ? subscription.updatedAt.toISOString() : null,
  };
}
