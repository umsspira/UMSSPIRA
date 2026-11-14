import type { MentorScheduleRepository } from '../ports/mentor-schedule-repository.port';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { MentorScheduleInput } from '../contracts/mentor-inputs';
import { validateWeeklySchedule } from '../../domain/policies/mentor-weekly-schedule.policy';

export class SetMentorScheduleUseCase {
  constructor(private readonly repository: MentorScheduleRepository) {}
  async execute(actor: ActorContext, input: MentorScheduleInput) {
    // CA-NF 03: el backend valida aunque el frontend haya dejado pasar un horario inválido.
    return this.repository.replace(actor.id, validateWeeklySchedule(input.schedule));
  }
}
