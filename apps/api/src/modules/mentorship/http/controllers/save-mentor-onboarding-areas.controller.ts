import { Body, Controller, HttpCode, Put } from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { OnboardingAreasInput } from '../../application/contracts/mentor-onboarding';
import { SaveMentorOnboardingAreasUseCase } from '../../application/use-cases/save-mentor-onboarding-areas.use-case';
import { presentMentorOnboarding } from '../presenters/mentor-onboarding.presenter';
import { onboardingAreasSchema } from '../schemas/mentorship.schemas';

@Controller('mentorship')
export class SaveMentorOnboardingAreasController {
  constructor(private readonly useCase: SaveMentorOnboardingAreasUseCase) {}

  @Put('onboarding/areas')
  @HttpCode(200)
  @RequirePermissions('mentores:self:write')
  async handle(
    @CurrentActor() actor: ActorContext,
    @Body(new ZodValidationPipe(onboardingAreasSchema)) body: OnboardingAreasInput,
  ) {
    const state = await this.useCase.execute(actor, { areaIds: body.areaIds });
    return { data: presentMentorOnboarding(state) };
  }
}
