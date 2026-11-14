import { Controller, Get } from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { GetMentorScheduleUseCase } from '../../application/use-cases/get-mentor-schedule.use-case';
import { presentWeeklySchedule } from '../presenters/mentor.presenter';

@Controller('mentorship')
export class GetMentorScheduleController {
  constructor(private readonly useCase: GetMentorScheduleUseCase) {}
  @Get('availability/schedule')
  @RequirePermissions('mentores:self:write')
  async handle(@CurrentActor() actor: ActorContext) {
    return { data: presentWeeklySchedule(await this.useCase.execute(actor)) };
  }
}
