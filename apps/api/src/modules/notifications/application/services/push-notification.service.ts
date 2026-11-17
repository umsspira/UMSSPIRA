import { Logger } from '@nestjs/common';
import type {
  PushNotificationDeliveryResult,
  PushNotificationPayload,
} from '../contracts/push-notification';
import type { PushNotifications } from '../ports/push-notifications.port';
import type { PushSender } from '../ports/push-sender.port';
import type { PushSubscriptionsRepository } from '../ports/push-subscriptions-repository.port';
import type { EventNotificationsRepository } from '../ports/event-notifications-repository.port';

export class PushNotificationService implements PushNotifications {
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(
    private readonly subscriptions: PushSubscriptionsRepository,
    private readonly sender: PushSender,
    private readonly eventNotifications: EventNotificationsRepository,
  ) {}

  async notify(
    userIds: string[],
    notification: PushNotificationPayload,
  ): Promise<PushNotificationDeliveryResult> {
    const uniqueUserIds = [...new Set(userIds)];
    if (uniqueUserIds.length === 0) {
      return { sent: 0, failed: 0, invalidEndpoints: 0 };
    }

    if (notification.eventId) {
      try {
        await this.eventNotifications.createForUsers(uniqueUserIds, notification);
      } catch (error) {
        this.logger.warn(`No se pudo guardar la notificación del evento: ${this.errorMessage(error)}`);
      }
    }

    const subscriptions = await this.subscriptions.listForUsers(uniqueUserIds);
    const endpoints = new Set<string>();
    const result: PushNotificationDeliveryResult = { sent: 0, failed: 0, invalidEndpoints: 0 };

    for (const subscription of subscriptions) {
      if (endpoints.has(subscription.endpoint)) {
        continue;
      }
      endpoints.add(subscription.endpoint);

      try {
        const delivery = await this.sender.send(subscription, notification);
        if (delivery === 'sent') {
          result.sent += 1;
        } else if (delivery === 'invalid') {
          result.invalidEndpoints += 1;
          try {
            await this.subscriptions.removeInvalidEndpoint(subscription.endpoint);
          } catch (error) {
            this.logger.warn(`No se pudo limpiar una suscripción Push inválida: ${this.errorMessage(error)}`);
          }
        } else {
          result.failed += 1;
        }
      } catch (error) {
        result.failed += 1;
        this.logger.warn(`No se pudo entregar una notificación Push: ${this.errorMessage(error)}`);
      }
    }

    return result;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'error desconocido';
  }
}
