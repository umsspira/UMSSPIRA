import { Body, Controller, Put } from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { SaveMentorInterestsUseCase } from '../../application/use-cases/save-mentor-interests.use-case';
import { presentSavedInterests } from '../presenters/mentor.presenter';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import { saveMentorInterestsSchema } from '../schemas/mentorship.schemas';
import type { SaveMentorInterestsInput } from '../../application/contracts/mentor-inputs';

@Controller('mentorship')
export class SaveMentorInterestsController {
  constructor(private readonly useCase: SaveMentorInterestsUseCase) {}

  @Put('interests')
  @RequirePermissions('mentores:self:write')
  async handle(
    @CurrentActor() actor: ActorContext,
    @Body(new ZodValidationPipe(saveMentorInterestsSchema)) body: SaveMentorInterestsInput,
  ) {
    return { data: presentSavedInterests(await this.useCase.execute(actor, body)) };
  }
}
