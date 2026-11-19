import { Body, Controller, HttpCode, Put } from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { OnboardingInterestsInput } from '../../application/contracts/mentor-onboarding';
import { SaveMentorOnboardingInterestsUseCase } from '../../application/use-cases/save-mentor-onboarding-interests.use-case';
import { presentMentorOnboarding } from '../presenters/mentor-onboarding.presenter';
import { onboardingInterestsSchema } from '../schemas/mentorship.schemas';

@Controller('mentorship')
export class SaveMentorOnboardingInterestsController {
  constructor(private readonly useCase: SaveMentorOnboardingInterestsUseCase) {}

  @Put('onboarding/interests')
  @HttpCode(200)
  @RequirePermissions('mentores:self:write')
  async handle(
    @CurrentActor() actor: ActorContext,
    @Body(new ZodValidationPipe(onboardingInterestsSchema)) body: OnboardingInterestsInput,
  ) {
    const state = await this.useCase.execute(actor, { interestIds: body.interestIds });
    return { data: presentMentorOnboarding(state) };
  }
}
