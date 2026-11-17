import { Controller, Get } from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { GetMentorOnboardingUseCase } from '../../application/use-cases/get-mentor-onboarding.use-case';
import { presentMentorOnboarding } from '../presenters/mentor-onboarding.presenter';

@Controller('mentorship')
export class GetMentorOnboardingController {
  constructor(private readonly useCase: GetMentorOnboardingUseCase) {}

  @Get('onboarding')
  @RequirePermissions('mentores:self:write')
  async handle(@CurrentActor() actor: ActorContext) {
    return { data: presentMentorOnboarding(await this.useCase.execute(actor)) };
  }
}
