import type { PushSubscriptionDto } from '@umsspira/shared-types';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { PushSubscriptionsRepository } from '../ports/push-subscriptions-repository.port';
import type { RegisterSubscriptionInput } from '../contracts/push-subscription-inputs';
import { presentPushSubscription } from '../../domain/entities/push-subscription';

/**
 * Registra o actualiza la suscripción Push del Titulado autenticado (HU13 - T8).
 * Es idempotente por `endpoint`: si el navegador reenvía la misma suscripción,
 * solo se actualizan las claves y las marcas de tiempo.
 */
export class RegisterPushSubscriptionUseCase {
  constructor(private readonly repository: PushSubscriptionsRepository) {}

  async execute(
    actor: ActorContext,
    input: RegisterSubscriptionInput,
  ): Promise<PushSubscriptionDto> {
    const stored = await this.repository.upsert(actor.id, input);
    return presentPushSubscription(stored);
  }
}
