import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { EventNotificationsRepository } from '../ports/event-notifications-repository.port';

export class MarkEventNotificationReadUseCase {
  constructor(private readonly repository: EventNotificationsRepository) {}

  execute(actor: ActorContext, notificationId: string): Promise<void> {
    return this.repository.markRead(actor.id, notificationId);
  }
}
