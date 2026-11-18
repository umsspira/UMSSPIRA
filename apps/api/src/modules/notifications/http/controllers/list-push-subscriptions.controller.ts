import { Controller, Get } from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { Roles } from '../../../../shared/http/auth/decorators/roles.decorator';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { ListPushSubscriptionsUseCase } from '../../application/use-cases/list-push-subscriptions.use-case';

@Controller('push-subscriptions')
export class ListPushSubscriptionsController {
  constructor(private readonly useCase: ListPushSubscriptionsUseCase) {}

  @Get()
  @Roles('titulado')
  async handle(@CurrentActor() actor: ActorContext) {
    return { data: await this.useCase.execute(actor) };
  }
}
