import { Body, Controller, Post } from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { Roles } from '../../../../shared/http/auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../../shared/http/pipes/zod-validation.pipe';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { RegisterPushSubscriptionUseCase } from '../../application/use-cases/register-push-subscription.use-case';
import {
  pushSubscriptionSchema,
  toRegisterSubscriptionInput,
  type PushSubscriptionSchema,
} from '../schemas/push-subscriptions.schemas';

@Controller('push-subscriptions')
export class RegisterPushSubscriptionController {
  constructor(private readonly useCase: RegisterPushSubscriptionUseCase) {}

  @Post()
  @Roles('titulado')
  async handle(
    @CurrentActor() actor: ActorContext,
    @Body(new ZodValidationPipe(pushSubscriptionSchema)) body: PushSubscriptionSchema,
  ) {
    const data = await this.useCase.execute(actor, toRegisterSubscriptionInput(body));
    return { data };
  }
}
