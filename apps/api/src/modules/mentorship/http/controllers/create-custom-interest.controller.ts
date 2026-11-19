import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../../../../shared/http/auth/decorators/require-permissions.decorator';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { CreateCustomInterestUseCase } from '../../application/use-cases/create-custom-interest.use-case';
import { presentInterest } from '../presenters/mentor.presenter';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import { createCustomInterestSchema } from '../schemas/mentorship.schemas';
import type { CreateCustomInterestInput } from '../../application/contracts/mentor-inputs';

@Controller('mentorship/interests')
export class CreateCustomInterestController {
  constructor(private readonly useCase: CreateCustomInterestUseCase) {}

  @Post('custom')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('mentores:self:write')
  async handle(
    @CurrentActor() actor: ActorContext,
    @Body(new ZodValidationPipe(createCustomInterestSchema)) body: CreateCustomInterestInput,
  ) {
    const result = await this.useCase.execute(actor, body);
    return {
      data: {
        ...presentInterest(result.interest),
        coincidencia_sugerido: result.coincidenciaSugerido,
        mensaje: result.mensaje,
      },
    };
  }
}
