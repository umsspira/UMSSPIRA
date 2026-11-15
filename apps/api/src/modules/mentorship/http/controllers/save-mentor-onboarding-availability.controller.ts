import { Body, Controller, HttpCode, Put } from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { OnboardingAvailabilityInput } from '../../application/contracts/mentor-onboarding';
import { SaveMentorOnboardingAvailabilityUseCase } from '../../application/use-cases/save-mentor-onboarding-availability.use-case';
import { presentMentorOnboarding } from '../presenters/mentor-onboarding.presenter';
import { onboardingAvailabilitySchema } from '../schemas/mentorship.schemas';

@Controller('mentorship')
export class SaveMentorOnboardingAvailabilityController {
  constructor(private readonly useCase: SaveMentorOnboardingAvailabilityUseCase) {}

  @Put('onboarding/availability')
  @HttpCode(200)
  @RequirePermissions('mentores:self:write')
  async handle(
    @CurrentActor() actor: ActorContext,
    @Body(new ZodValidationPipe(onboardingAvailabilitySchema))
    body: OnboardingAvailabilityInput,
  ) {
    const state = await this.useCase.execute(actor, {
      availabilityStatus: body.availabilityStatus,
      schedules: body.schedules,
    });
    return { data: presentMentorOnboarding(state) };
  }
}
