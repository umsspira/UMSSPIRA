import type { Provider } from '@nestjs/common';
import {
  PUSH_SUBSCRIPTIONS_REPOSITORY,
  type PushSubscriptionsRepository,
} from '../../application/ports/push-subscriptions-repository.port';
import { PrismaPushSubscriptionsRepository } from '../repositories/prisma-push-subscriptions.repository';
import { RegisterPushSubscriptionUseCase } from '../../application/use-cases/register-push-subscription.use-case';
import { UnregisterPushSubscriptionUseCase } from '../../application/use-cases/unregister-push-subscription.use-case';
import { ListPushSubscriptionsUseCase } from '../../application/use-cases/list-push-subscriptions.use-case';

export const notificationsProviders: Provider[] = [
  PrismaPushSubscriptionsRepository,
  {
    provide: PUSH_SUBSCRIPTIONS_REPOSITORY,
    useExisting: PrismaPushSubscriptionsRepository,
  },
  {
    provide: RegisterPushSubscriptionUseCase,
    inject: [PUSH_SUBSCRIPTIONS_REPOSITORY],
    useFactory: (repository: PushSubscriptionsRepository) =>
      new RegisterPushSubscriptionUseCase(repository),
  },
  {
    provide: UnregisterPushSubscriptionUseCase,
    inject: [PUSH_SUBSCRIPTIONS_REPOSITORY],
    useFactory: (repository: PushSubscriptionsRepository) =>
      new UnregisterPushSubscriptionUseCase(repository),
  },
  {
    provide: ListPushSubscriptionsUseCase,
    inject: [PUSH_SUBSCRIPTIONS_REPOSITORY],
    useFactory: (repository: PushSubscriptionsRepository) =>
      new ListPushSubscriptionsUseCase(repository),
  },
];
