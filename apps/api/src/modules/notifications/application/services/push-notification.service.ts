import { Logger } from '@nestjs/common';
import type {
  PushNotificationDeliveryResult,
  PushNotificationPayload,
} from '../contracts/push-notification';
import type { PushNotifications } from '../ports/push-notifications.port';
import type { PushSender } from '../ports/push-sender.port';
import type { PushSubscriptionsRepository } from '../ports/push-subscriptions-repository.port';
import type { EventNotificationsRepository } from '../ports/event-notifications-repository.port';

export interface PushDeviceDelivery {
  deviceId: string;
  outcome: 'sent' | 'invalid' | 'failed';
  error?: string;
}

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
    const deliveries = await this.notifyWithResults(userIds, notification);
    return deliveries.reduce<PushNotificationDeliveryResult>((result, delivery) => {
      if (delivery.outcome === 'sent') {
        result.sent += 1;
      } else if (delivery.outcome === 'invalid') {
        result.invalidEndpoints += 1;
      } else {
        result.failed += 1;
      }
      return result;
    }, { sent: 0, failed: 0, invalidEndpoints: 0 });
  }

  async notifyWithResults(
    userIds: string[],
    notification: PushNotificationPayload,
    excludedDeviceIds: ReadonlySet<string> = new Set(),
    onDelivery?: (delivery: PushDeviceDelivery) => Promise<void>,
    reminderId?: string,
  ): Promise<PushDeviceDelivery[]> {
    const uniqueUserIds = [...new Set(userIds)];
    if (uniqueUserIds.length === 0) {
      return [];
    }

    if (notification.eventId) {
      try {
        await this.eventNotifications.createForUsers(uniqueUserIds, notification, reminderId);
      } catch (error) {
        this.logger.warn(`No se pudo guardar la notificación del evento: ${this.errorMessage(error)}`);
      }
    }

    const subscriptions = await this.subscriptions.listForUsers(uniqueUserIds);
    const endpoints = new Set<string>();
    const deliveries: PushDeviceDelivery[] = [];

    for (const subscription of subscriptions) {
      if (excludedDeviceIds.has(subscription.deviceId) || endpoints.has(subscription.endpoint)) {
        continue;
      }
      endpoints.add(subscription.endpoint);

      let delivery: PushDeviceDelivery;
      try {
        const outcome = await this.sender.send(subscription, notification);
        delivery = {
          deviceId: subscription.deviceId,
          outcome,
          ...(outcome === 'failed' ? { error: 'El proveedor Push no confirmó la entrega' } : {}),
        };
        if (outcome === 'invalid') {
          try {
            await this.subscriptions.removeInvalidEndpoint(subscription.endpoint);
          } catch (error) {
            this.logger.warn(`No se pudo limpiar una suscripción Push inválida: ${this.errorMessage(error)}`);
          }
        }
      } catch (error) {
        const message = this.errorMessage(error);
        delivery = { deviceId: subscription.deviceId, outcome: 'failed', error: message };
        this.logger.warn(`No se pudo entregar una notificación Push: ${message}`);
      }
      deliveries.push(delivery);
      await onDelivery?.(delivery);
    }

    return deliveries;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'error desconocido';
  }
}
