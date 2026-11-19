import type { PushSubscriptionDto } from '@umsspira/shared-types';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { PushSubscriptionsRepository } from '../ports/push-subscriptions-repository.port';
import { presentPushSubscription } from '../../domain/entities/push-subscription';

/**
 * Lista las suscripciones Push activas del Titulado (HU13 - T8).
 */
export class ListPushSubscriptionsUseCase {
  constructor(private readonly repository: PushSubscriptionsRepository) {}

  async execute(actor: ActorContext): Promise<PushSubscriptionDto[]> {
    const stored = await this.repository.listByUser(actor.id);
    return stored.map(presentPushSubscription);
  }
}
