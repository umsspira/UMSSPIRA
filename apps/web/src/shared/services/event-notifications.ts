import type { NavbarActivity } from '@/shared/components/navbar/types';
import { apiClient } from './api-client';

const EVENT_NOTIFICATIONS_PATH = '/api/v1/event-notifications';

export async function listEventNotifications(): Promise<NavbarActivity[]> {
  const result = await apiClient<{ data: NavbarActivity[] }>(EVENT_NOTIFICATIONS_PATH, {
    authenticated: true,
  });
  return result.data;
}

export async function markEventNotificationRead(notificationId: string): Promise<void> {
  await apiClient(`${EVENT_NOTIFICATIONS_PATH}/${encodeURIComponent(notificationId)}/read`, {
    method: 'PATCH',
    authenticated: true,
  });
}
