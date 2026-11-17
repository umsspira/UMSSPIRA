import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import webpush from 'web-push';
import type { Environment } from '../../../../config/environment';
import type { PushNotificationPayload } from '../../application/contracts/push-notification';
import type { PushSender, PushSendResult } from '../../application/ports/push-sender.port';
import type { PushDeliverySubscription } from '../../domain/entities/push-subscription';

@Injectable()
export class WebPushAdapter implements PushSender {
  private readonly logger = new Logger(WebPushAdapter.name);

  constructor(config: ConfigService<Environment, true>) {
    webpush.setVapidDetails(
      config.get('VAPID_SUBJECT', { infer: true }),
      config.get('VAPID_PUBLIC_KEY', { infer: true }),
      config.get('VAPID_PRIVATE_KEY', { infer: true }),
    );
  }

  async send(
    subscription: PushDeliverySubscription,
    notification: PushNotificationPayload,
  ): Promise<PushSendResult> {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        JSON.stringify(notification),
      );
      return 'sent';
    } catch (error) {
      const statusCode = this.statusCode(error);
      if (statusCode === 404 || statusCode === 410) {
        return 'invalid';
      }
      this.logger.warn(`El proveedor Push rechazó una entrega${statusCode ? ` (HTTP ${statusCode})` : ''}`);
      return 'failed';
    }
  }

  private statusCode(error: unknown): number | undefined {
    if (typeof error === 'object' && error !== null && 'statusCode' in error) {
      const value = error.statusCode;
      return typeof value === 'number' ? value : undefined;
    }
    return undefined;
  }
}
