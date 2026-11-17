'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { usePushPermission } from '@/features/notifications/hooks/usePushPermission';
import { usePushSubscription } from '@/features/notifications/hooks/usePushSubscription';
import { describeUnsupportedReason } from '@/shared/services/push-permissions';
import type { NavbarActivity } from './types';
import styles from './navbar.module.css';

type View = 'list' | 'settings' | 'prompt' | 'browser' | 'active';

interface NotificationCenterProps {
  items: NavbarActivity[];
  resolveHref: (href: string) => string;
  onClose: () => void;
  onNavigate: () => void;
}

/**
 * Centro de notificaciones de la campana (HU13 - T7, T8, T11, T12).
 * Ventanas: lista → ajustes → activar avisos → avisos del navegador → activados.
 */
export function NotificationCenter({ items, resolveHref, onClose, onNavigate }: NotificationCenterProps) {
  const { permission, support, requesting, request } = usePushPermission();
  const { status, error, subscribe, unsubscribe } = usePushSubscription(permission);
  const [view, setView] = useState<View>('list');

  const denied = permission === 'denied';
  const unsupportedText = support.supported ? null : describeUnsupportedReason(support.reason);
  const active = support.supported && permission === 'granted' && status === 'subscribed';
  const busy = requesting || status === 'subscribing';
  const blockedText =
    unsupportedText ??
    (denied
      ? 'Bloqueaste las notificaciones. Habilítalas desde la configuración de tu navegador para recibir avisos de eventos.'
      : null);

  useEffect(() => {
    if (view === 'browser' && active) setView('active');
    if ((view === 'browser' || view === 'prompt') && denied) setView('settings');
  }, [view, active, denied]);

  const stateFooter = unsupportedText
    ? 'Este navegador no admite avisos.'
    : denied
      ? 'Los avisos del navegador están bloqueados.'
      : active
        ? 'Los avisos del navegador están activados.'
        : 'Los avisos del navegador están desactivados.';

  const stateBadge = unsupportedText ? 'NO DISPONIBLE' : denied ? 'BLOQUEADOS' : active ? 'ACTIVADOS' : 'DESACTIVADOS';

  const handleContinue = async () => {
    const result = permission === 'granted' ? 'granted' : await request();
    if (result === 'granted') {
      await subscribe();
    } else {
      setView('settings');
    }
  };

  const handleDisable = async () => {
    await unsubscribe();
    setView('settings');
  };

  /* 1. Lista de avisos */
  if (view === 'list') {
    return (
      <>
        <header className={styles.noticeHeader}>
          <h2>Notificaciones</h2>
          <p>Actualizaciones de tus eventos</p>
        </header>

        {items.length ? (
          <ul className={styles.noticeList}>
            {items.map(item => (
              <li key={item.id} className={styles.noticeCard}>
                <strong>{item.title}</strong>
                <small>{item.description}</small>
                {item.href && (
                  <Link href={resolveHref(item.href)} onClick={onNavigate} prefetch={false} className={styles.noticeAction}>
                    {item.actionLabel ?? 'Ver evento'}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.activityEmpty}>
            <Bell size={25} />
            <p>No tienes notificaciones nuevas.</p>
          </div>
        )}

        <p className={styles.noticeStatus}>{stateFooter}</p>
        <div className={styles.noticeActions}>
          <button type="button" className={styles.noticeSecondary} onClick={() => setView(active ? 'active' : 'settings')}>
            Configurar avisos
          </button>
          <button type="button" className={styles.noticeSecondary} onClick={onClose}>
            Cerrar
          </button>
        </div>
      </>
    );
  }

  /* 2. Ajustes de notificaciones */
  if (view === 'settings') {
    return (
      <div className={styles.noticeView}>
        <h3 className={styles.noticeTitle}>Ajustes de notificaciones</h3>
        <p className={styles.noticeText}>Recibe recordatorios y cambios de tus eventos.</p>
        <hr className={styles.noticeDivider} />

        <div className={styles.noticeRow}>
          <strong>Avisos del navegador</strong>
          <span className={active ? styles.noticeBadgeOn : styles.noticeBadgeOff}>{stateBadge}</span>
        </div>
        <p className={styles.noticeText}>Permite que UMSSPIRA te avise aunque no estés navegando aquí.</p>
        <p className={styles.noticeText}>Incluye cambios, cancelaciones y recordatorios.</p>

        {error && <p role="alert" className={styles.noticeError}>{error}</p>}

        {blockedText ? (
          <p className={styles.noticeWarn}>{blockedText}</p>
        ) : (
          <button type="button" className={`${styles.noticePrimary} ${styles.noticeFull}`} onClick={() => setView('prompt')} disabled={busy}>
            Activar avisos
          </button>
        )}

        <p className={styles.noticeHint}>Tú decides cuándo activar o desactivar estos avisos.</p>
        <hr className={styles.noticeDivider} />
        <div className={styles.noticeButtons}>
          <button type="button" className={styles.noticeSecondary} onClick={() => setView('list')}>
            Volver a mis avisos
          </button>
        </div>
      </div>
    );
  }

  /* 3. Activar avisos (opcional) */
  if (view === 'prompt') {
    return (
      <div className={styles.noticeView}>
        <p className={styles.noticeEyebrow}>Ajustes de notificaciones</p>
        <h3 className={styles.noticeTitle}>Activar avisos</h3>
        <span className={styles.noticeChip}>Avisos opcionales</span>
        <hr className={styles.noticeDivider} />
        <p className={styles.noticeText}>
          Recibirás avisos cuando cambie o se cancele uno de tus eventos y cuando esté por comenzar.
        </p>
        <p className={styles.noticeHint}>El navegador te pedirá autorización antes de activar los avisos.</p>
        <hr className={styles.noticeDivider} />
        <div className={styles.noticeButtons}>
          <button type="button" className={styles.noticePrimary} onClick={() => setView('browser')}>
            Solicitar permiso
          </button>
          <button type="button" className={styles.noticeSecondary} onClick={() => setView('settings')}>
            Ahora no
          </button>
        </div>
      </div>
    );
  }

  /* 4. Avisos del navegador: aquí se pide el permiso real */
  if (view === 'browser') {
    return (
      <div className={styles.noticeView}>
        <p className={styles.noticeEyebrow}>Avisos del navegador</p>
        <h3 className={styles.noticeTitle}>Activar notificaciones</h3>
        <p className={styles.noticeText}>
          Al continuar, tu navegador te pedirá permiso para mostrar avisos de tus eventos.
        </p>
        <p className={styles.noticeHint}>Podrás aceptar o bloquear el permiso desde el navegador.</p>

        {error && <p role="alert" className={styles.noticeError}>{error}</p>}

        <div className={styles.noticeButtons}>
          <button type="button" className={styles.noticeSecondary} onClick={() => setView('settings')} disabled={busy}>
            Ahora no
          </button>
          <button type="button" className={styles.noticePrimary} onClick={() => void handleContinue()} disabled={busy}>
            {busy ? 'Solicitando…' : 'Continuar'}
          </button>
        </div>
      </div>
    );
  }

  /* 5. Avisos activados */
  return (
    <div className={styles.noticeView}>
      <p className={styles.noticeEyebrow}>Ajustes de notificaciones</p>
      <h3 className={styles.noticeTitle}>Los avisos están activados</h3>
      <span className={styles.noticeChipOn}>Activados</span>
      <hr className={styles.noticeDivider} />
      <p className={styles.noticeText}>Te avisaremos sobre cambios, cancelaciones y recordatorios de tus eventos.</p>
      <p className={styles.noticeHint}>Puedes cambiar esta opción cuando quieras desde la campana.</p>
      <hr className={styles.noticeDivider} />
      <div className={styles.noticeButtons}>
        <button type="button" className={styles.noticePrimary} onClick={() => void handleDisable()} disabled={busy}>
          Desactivar avisos
        </button>
        <button type="button" className={styles.noticeSecondary} onClick={() => setView('list')}>
          Ver mis avisos
        </button>
      </div>
    </div>
  );
}
