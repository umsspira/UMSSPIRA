export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  eventId?: string;
}

export interface PushNotificationDeliveryResult {
  sent: number;
  failed: number;
  invalidEndpoints: number;
}
