import type {
  PushNotificationDeliveryResult,
  PushNotificationPayload,
} from '../contracts/push-notification';

export const PUSH_NOTIFICATIONS = Symbol('PUSH_NOTIFICATIONS');

/** Contrato público del módulo para notificar a usuarios registrados. */
export interface PushNotifications {
  notify(
    userIds: string[],
    notification: PushNotificationPayload,
  ): Promise<PushNotificationDeliveryResult>;
}
