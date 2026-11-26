'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { listEventNotifications, markEventNotificationRead } from '@/shared/services/event-notifications';
import type { NavbarActivity } from '@/shared/components/navbar/types';

export function useEventNotifications(enabled: boolean) {
  const [items, setItems] = useState<NavbarActivity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<NavbarActivity | null>(null);
  const seenIds = useRef(new Set<string>());
  const hasLoaded = useRef(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const notifications = await listEventNotifications();
      const freshNotifications = notifications.filter((item) => !seenIds.current.has(item.id));
      if (hasLoaded.current && freshNotifications.length > 0) {
        setToast(freshNotifications[0]);
      }
      notifications.forEach((item) => seenIds.current.add(item.id));
      hasLoaded.current = true;
      setItems(notifications.filter((item) => !item.isReminder));
      setError(null);
    } catch {
      setError('No se pudieron cargar las notificaciones.');
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      seenIds.current.clear();
      hasLoaded.current = false;
      setItems([]);
      setError(null);
      setToast(null);
      return;
    }

    void refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    const interval = window.setInterval(refresh, 30_000);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      window.clearInterval(interval);
    };
  }, [enabled, refresh]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 8_000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const markRead = useCallback(async (id: string) => {
    await markEventNotificationRead(id);
    setItems((current) => current.map((item) => (
      item.id === id ? { ...item, unread: false } : item
    )));
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  return { items, error, markRead, refresh, toast, dismissToast };
}
