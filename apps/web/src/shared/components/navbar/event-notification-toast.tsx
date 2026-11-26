'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import type { NavbarActivity } from './types';
import styles from './navbar.module.css';

export function EventNotificationToast({
  item,
  onClose,
}: {
  item: NavbarActivity | null;
  onClose: () => void;
}) {
  if (!item) return null;

  return (
    <aside className={styles.notificationToast} role="status" aria-live="polite">
      <div className={styles.notificationToastCopy}>
        <strong>{item.title}</strong>
        <p>{item.description}</p>
        {item.href && (
          <Link href={item.href} onClick={onClose} prefetch={false}>
            Ver evento
          </Link>
        )}
      </div>
      <button type="button" aria-label="Cerrar recordatorio" title="Cerrar recordatorio" onClick={onClose}>
        <X size={18} aria-hidden="true" />
      </button>
    </aside>
  );
}
