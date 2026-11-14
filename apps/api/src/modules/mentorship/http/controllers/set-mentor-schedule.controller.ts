import { Body, Controller, Put } from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { SetMentorScheduleUseCase } from '../../application/use-cases/set-mentor-schedule.use-case';
import { presentWeeklySchedule } from '../presenters/mentor.presenter';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import { mentorScheduleSchema } from '../schemas/mentorship.schemas';
import type { MentorScheduleInput } from '../../application/contracts/mentor-inputs';

@Controller('mentorship')
export class SetMentorScheduleController {
  constructor(private readonly useCase: SetMentorScheduleUseCase) {}
  @Put('availability/schedule')
  @RequirePermissions('mentores:self:write')
  async handle(
    @CurrentActor() actor: ActorContext,
    @Body(new ZodValidationPipe(mentorScheduleSchema)) body: MentorScheduleInput,
  ) {
    const saved = await this.useCase.execute(actor, body);
    return { data: { ...presentWeeklySchedule(saved), mensaje: 'Horarios guardados' } };
  }
}
