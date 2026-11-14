'use client';

import { useEffect, useState } from 'react';
import { BellOff, BellRing, ShieldAlert } from 'lucide-react';
import { describeUnsupportedReason } from '@/shared/services/push-permissions';
import { usePushPermission } from '../hooks/usePushPermission';
import { usePushSubscription } from '../hooks/usePushSubscription';
import styles from './push-permission-panel.module.css';

const DISMISS_KEY = 'umsspira:push-prompt-dismissed';

function readDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function writeDismissed(value: boolean): void {
  try {
    if (value) window.sessionStorage.setItem(DISMISS_KEY, '1');
    else window.sessionStorage.removeItem(DISMISS_KEY);
  } catch {
    // Sin sessionStorage solo se pierde la preferencia de esta sesión.
  }
}

/**
 * Panel «Activar avisos» de notificaciones Push (HU13 - T7 y T8).
 * Se muestra dentro del desplegable de notificaciones del navbar (ActivityPanel)
 * y sigue el mockup: «Solicitar permiso» / «Ahora no».
 */
export function PushPermissionPanel() {
  const { permission, support, requesting, request } = usePushPermission();
  const { status, error, subscribe, unsubscribe } = usePushSubscription(permission);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(readDismissed());
  }, []);

  if (!support.supported) {
    return (
      <div className={styles.panel}>
        <div className={`${styles.status} ${styles.warn}`}>
          <ShieldAlert size={16} aria-hidden="true" />
          <p>{describeUnsupportedReason(support.reason)}</p>
        </div>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className={styles.panel}>
        <div className={`${styles.status} ${styles.warn}`}>
          <BellOff size={16} aria-hidden="true" />
          <p>
            Bloqueaste las notificaciones. Habilítalas desde la configuración de tu
            navegador para recibir avisos de eventos.
          </p>
        </div>
      </div>
    );
  }

  const busy = requesting || status === 'subscribing';
  const subscribed = permission === 'granted' && status === 'subscribed';

  const handleActivate = async () => {
    writeDismissed(false);
    setDismissed(false);
    const result = permission === 'granted' ? permission : await request();
    if (result === 'granted') {
      await subscribe();
    }
  };

  const handleDismiss = () => {
    writeDismissed(true);
    setDismissed(true);
  };

  if (subscribed) {
    return (
      <div className={styles.panel}>
        <div className={`${styles.status} ${styles.ok}`}>
          <BellRing size={16} aria-hidden="true" />
          <p>Recibirás avisos de cambios y cancelaciones de tus eventos.</p>
        </div>
        <button type="button" className={styles.secondary} onClick={() => void unsubscribe()}>
          Desactivar notificaciones
        </button>
      </div>
    );
  }

  if (dismissed) {
    return (
      <div className={styles.panel}>
        <p className={styles.text}>Los avisos de eventos están desactivados por ahora.</p>
        <button type="button" className={styles.secondary} onClick={() => void handleActivate()} disabled={busy}>
          Activar avisos
        </button>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <p className={styles.eyebrow}>Ajustes de notificación</p>
      <span className={styles.chip}>Avisos opcionales</span>
      <h3 className={styles.title}>Activar avisos</h3>
      <p className={styles.text}>
        Recibirás avisos cuando cambie o se cancele uno de tus eventos y cuando esté por comenzar.
      </p>
      <p className={styles.hint}>El navegador te pedirá autorización antes de activar los avisos.</p>

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={() => void handleActivate()} disabled={busy}>
          {busy ? 'Solicitando…' : 'Solicitar permiso'}
        </button>
        <button type="button" className={styles.secondary} onClick={handleDismiss} disabled={busy}>
          Ahora no
        </button>
      </div>
    </div>
  );
}