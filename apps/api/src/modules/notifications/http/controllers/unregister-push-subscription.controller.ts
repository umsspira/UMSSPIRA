import { Body, Controller, Delete, HttpCode } from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { Roles } from '../../../../shared/http/auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { UnregisterPushSubscriptionUseCase } from '../../application/use-cases/unregister-push-subscription.use-case';
import { unsubscribeSchema } from '../schemas/push-subscriptions.schemas';
import type { z } from 'zod';

@Controller('push-subscriptions')
export class UnregisterPushSubscriptionController {
  constructor(private readonly useCase: UnregisterPushSubscriptionUseCase) {}

  @Delete()
  @HttpCode(204)
  @Roles('titulado')
  async handle(
    @CurrentActor() actor: ActorContext,
    @Body(new ZodValidationPipe(unsubscribeSchema)) body: z.infer<typeof unsubscribeSchema>,
  ): Promise<void> {
    await this.useCase.execute(actor, body.endpoint);
  }
}
