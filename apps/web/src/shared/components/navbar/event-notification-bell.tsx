'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { ActivityPanel } from './activity-panel';
import type { NavbarActivity } from './types';
import styles from './navbar.module.css';

export function EventNotificationBell({
  items,
  error,
  onNotificationRead,
}: {
  items: NavbarActivity[];
  error: string | null;
  onNotificationRead: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    const handleOutside = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const close = () => setOpen(false);

  return (
    <div className={styles.notificationControl} ref={root}>
      <button
        type="button"
        className={styles.notificationIconButton}
        aria-label="Notificaciones"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <Bell size={21} aria-hidden="true" />
        {items.some((item) => item.unread) && <span className={styles.badge} aria-label="Hay elementos sin leer" />}
      </button>
      {open && (
        <div className={`${styles.activityPopover} ${styles.notificationPopover}`} id={panelId}>
          <ActivityPanel
            kind="notifications"
            items={items}
            resolveHref={(href) => href}
            onNavigate={close}
            notificationsError={error}
            onNotificationRead={onNotificationRead}
          />
        </div>
      )}
    </div>
  );
}
