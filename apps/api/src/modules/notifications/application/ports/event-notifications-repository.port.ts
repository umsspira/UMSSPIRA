import type { PushNotificationPayload } from '../contracts/push-notification';

export const EVENT_NOTIFICATIONS_REPOSITORY = Symbol('EVENT_NOTIFICATIONS_REPOSITORY');

export interface EventNotificationRecord {
  id: string;
  title: string;
  body: string;
  url: string | null;
  createdAt: Date;
  readAt: Date | null;
}

export interface EventNotificationsRepository {
  createForUsers(
    userIds: string[],
    notification: PushNotificationPayload,
    reminderId?: string,
  ): Promise<void>;
  listByUser(userId: string): Promise<EventNotificationRecord[]>;
  markRead(userId: string, notificationId: string): Promise<void>;
}
