import type { PushDeliverySubscription } from '../../domain/entities/push-subscription';
import type { PushNotificationPayload } from '../contracts/push-notification';

export const PUSH_SENDER = Symbol('PUSH_SENDER');

export type PushSendResult = 'sent' | 'invalid' | 'failed';

/** Puerto hacia el proveedor Web Push. */
export interface PushSender {
  send(
    subscription: PushDeliverySubscription,
    notification: PushNotificationPayload,
  ): Promise<PushSendResult>;
}
