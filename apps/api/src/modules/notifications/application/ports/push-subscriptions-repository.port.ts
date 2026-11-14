import type {
  RegisterPushSubscriptionInput,
  PushDeliverySubscription,
  StoredPushSubscription,
} from '../../domain/entities/push-subscription';

export const PUSH_SUBSCRIPTIONS_REPOSITORY = Symbol('PUSH_SUBSCRIPTIONS_REPOSITORY');

/**
 * Persistencia de suscripciones Push (HU13 - T8).
 * Una suscripción se identifica por su `endpoint` (único por navegador/dispositivo).
 */
export interface PushSubscriptionsRepository {
  /** Crea o actualiza la suscripción del usuario para ese endpoint. */
  upsert(
    userId: string,
    input: RegisterPushSubscriptionInput,
  ): Promise<StoredPushSubscription>;

  /** Elimina la suscripción del usuario para ese endpoint. */
  removeByEndpoint(userId: string, endpoint: string): Promise<void>;

  /** Lista las suscripciones activas del usuario (para HU16 y diagnóstico). */
  listByUser(userId: string): Promise<StoredPushSubscription[]>;

  /** Obtiene las suscripciones con claves, únicamente para el envío interno. */
  listForUsers(userIds: string[]): Promise<PushDeliverySubscription[]>;

  /** Limpia un endpoint inválido sin requerir un actor autenticado. */
  removeInvalidEndpoint(endpoint: string): Promise<void>;
}
