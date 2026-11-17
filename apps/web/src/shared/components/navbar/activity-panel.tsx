'use client';

import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { NotificationCenter } from './notification-center';
import type { NavbarActivity } from './types';
import styles from './navbar.module.css';

export function ActivityPanel({ kind, items, resolveHref, onNavigate, onNotificationRead }: {
  kind: 'messages' | 'notifications';
  items: NavbarActivity[];
  resolveHref: (href: string) => string;
  onNavigate: () => void;
  onNotificationRead?: (id: string) => void;
}) {
  if (kind === 'notifications') {
    return <section className={styles.activityPanel} aria-label="Notificaciones">
      <NotificationCenter
        items={items}
        resolveHref={resolveHref}
        onClose={onNavigate}
        onNavigate={onNavigate}
        onNotificationRead={onNotificationRead}
      />
    </section>;
  }

  const Icon = MessageSquare;
  return <section className={styles.activityPanel} aria-label="Mensajes"><h2>Mensajes</h2>
    {items.length ? <ul>{items.map(item => <li key={item.id}>{item.href ? <Link href={resolveHref(item.href)} onClick={onNavigate} prefetch={false} className={styles.activityItem}><Icon size={18} /><span><strong>{item.title}</strong><small>{item.description}</small></span>{item.unread && <span className={styles.unread} aria-label="Sin leer" />}</Link> : <div className={styles.activityItem}><Icon size={18} /><span><strong>{item.title}</strong><small>{item.description}</small></span>{item.unread && <span className={styles.unread} aria-label="Sin leer" />}</div>}</li>)}</ul> : <div className={styles.activityEmpty}><Icon size={25} /><p>No tienes mensajes nuevos.</p></div>}
  </section>;
}
