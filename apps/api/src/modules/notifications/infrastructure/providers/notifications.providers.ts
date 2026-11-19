import type { Provider } from '@nestjs/common';
import {
  PUSH_SUBSCRIPTIONS_REPOSITORY,
  type PushSubscriptionsRepository,
} from '../../application/ports/push-subscriptions-repository.port';
import { PrismaPushSubscriptionsRepository } from '../repositories/prisma-push-subscriptions.repository';
import { RegisterPushSubscriptionUseCase } from '../../application/use-cases/register-push-subscription.use-case';
import { UnregisterPushSubscriptionUseCase } from '../../application/use-cases/unregister-push-subscription.use-case';
import { ListPushSubscriptionsUseCase } from '../../application/use-cases/list-push-subscriptions.use-case';
import { PUSH_SENDER, type PushSender } from '../../application/ports/push-sender.port';
import { PUSH_NOTIFICATIONS } from '../../application/ports/push-notifications.port';
import { PushNotificationService } from '../../application/services/push-notification.service';
import { WebPushAdapter } from '../adapters/web-push.adapter';

export const notificationsProviders: Provider[] = [
  PrismaPushSubscriptionsRepository,
  WebPushAdapter,
  {
    provide: PUSH_SUBSCRIPTIONS_REPOSITORY,
    useExisting: PrismaPushSubscriptionsRepository,
  },
  {
    provide: PUSH_SENDER,
    useExisting: WebPushAdapter,
  },
  {
    provide: PushNotificationService,
    inject: [PUSH_SUBSCRIPTIONS_REPOSITORY, PUSH_SENDER],
    useFactory: (repository: PushSubscriptionsRepository, sender: PushSender) =>
      new PushNotificationService(repository, sender),
  },
  {
    provide: PUSH_NOTIFICATIONS,
    useExisting: PushNotificationService,
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
