import type { EventsRepository } from '../ports/events-repository.port';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';

export class ScheduleEventDraftUseCase {
  constructor(private readonly repository: EventsRepository) {}

  async execute(actor: ActorContext, id: string, scheduledAt: Date) {
    return this.repository.scheduleDraftPublication(actor.id, id, scheduledAt);
  }
}
