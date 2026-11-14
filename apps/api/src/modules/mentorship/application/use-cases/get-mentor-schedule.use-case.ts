import type { MentorScheduleRepository } from '../ports/mentor-schedule-repository.port';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';

export class GetMentorScheduleUseCase {
  constructor(private readonly repository: MentorScheduleRepository) {}
  execute(actor: ActorContext) {
    return this.repository.own(actor.id);
  }
}
