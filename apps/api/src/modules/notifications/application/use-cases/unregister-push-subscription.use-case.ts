import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { PushSubscriptionsRepository } from '../ports/push-subscriptions-repository.port';

/**
 * Elimina la suscripción Push del Titulado autenticado (HU13 - T8).
 * La operación es idempotente: eliminar una suscripción inexistente no falla.
 */
export class UnregisterPushSubscriptionUseCase {
  constructor(private readonly repository: PushSubscriptionsRepository) {}

  async execute(actor: ActorContext, endpoint: string): Promise<void> {
    await this.repository.removeByEndpoint(actor.id, endpoint);
  }
}
