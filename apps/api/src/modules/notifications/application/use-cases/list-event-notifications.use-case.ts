import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type {
  EventNotificationRecord,
  EventNotificationsRepository,
} from '../ports/event-notifications-repository.port';

export class ListEventNotificationsUseCase {
  constructor(private readonly repository: EventNotificationsRepository) {}

  execute(actor: ActorContext): Promise<EventNotificationRecord[]> {
    return this.repository.listByUser(actor.id);
  }
}
