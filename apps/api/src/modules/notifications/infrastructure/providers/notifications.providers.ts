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
import {
  EVENT_NOTIFICATIONS_REPOSITORY,
  type EventNotificationsRepository,
} from '../../application/ports/event-notifications-repository.port';
import { PrismaEventNotificationsRepository } from '../repositories/prisma-event-notifications.repository';
import { ListEventNotificationsUseCase } from '../../application/use-cases/list-event-notifications.use-case';
import { MarkEventNotificationReadUseCase } from '../../application/use-cases/mark-event-notification-read.use-case';

export const notificationsProviders: Provider[] = [
  PrismaPushSubscriptionsRepository,
  PrismaEventNotificationsRepository,
  WebPushAdapter,
  {
    provide: EVENT_NOTIFICATIONS_REPOSITORY,
    useExisting: PrismaEventNotificationsRepository,
  },
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
    inject: [PUSH_SUBSCRIPTIONS_REPOSITORY, PUSH_SENDER, EVENT_NOTIFICATIONS_REPOSITORY],
    useFactory: (
      repository: PushSubscriptionsRepository,
      sender: PushSender,
      eventNotifications: EventNotificationsRepository,
    ) => new PushNotificationService(repository, sender, eventNotifications),
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
  {
    provide: ListEventNotificationsUseCase,
    inject: [EVENT_NOTIFICATIONS_REPOSITORY],
    useFactory: (repository: EventNotificationsRepository) =>
      new ListEventNotificationsUseCase(repository),
  },
  {
    provide: MarkEventNotificationReadUseCase,
    inject: [EVENT_NOTIFICATIONS_REPOSITORY],
    useFactory: (repository: EventNotificationsRepository) =>
      new MarkEventNotificationReadUseCase(repository),
  },
];
