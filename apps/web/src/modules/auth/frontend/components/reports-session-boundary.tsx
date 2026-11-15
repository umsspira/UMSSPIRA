'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { authenticatedFetch, SessionError } from '@/shared/services/auth-session';
import { notifySessionExpired, SESSION_EXPIRED_EVENT } from '../services/session-expired';
import { SessionExpiredDialog } from './session-expired-dialog';

// El middleware protege cada navegación. Esta revalidación cubre la pestaña
// abierta durante mucho tiempo y los filtros que operan sobre datos ya cargados.
const SESSION_RECHECK_MS = 30_000;

export function ReportsSessionBoundary({ children }: { children: ReactNode }) {
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    let active = true;
    let checking = false;
    let invalidated = false;

    const onExpired = () => {
      invalidated = true;
      setExpired(true);
    };

    async function checkSession() {
      if (!active || checking || invalidated) return;
      checking = true;
      try {
        // Usa el cliente compartido: reintenta un access token renovable;
        // el 401 final representa una sesión que ya no se puede usar.
        const response = await authenticatedFetch('/api/v1/auth/me', {
          cache: 'no-store',
        });
        if (active && response.status === 401) notifySessionExpired();
      } catch (error) {
        if (active && error instanceof SessionError && error.status === 401) {
          notifySessionExpired();
        }
        // Red/5xx: no confundir indisponibilidad temporal con sesión caducada.
      } finally {
        checking = false;
      }
    }

    function recheckWhenVisible() {
      if (!document.hidden) void checkSession();
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    window.addEventListener('focus', recheckWhenVisible);
    document.addEventListener('visibilitychange', recheckWhenVisible);
    const timer = window.setInterval(recheckWhenVisible, SESSION_RECHECK_MS);
    void checkSession();

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
      window.removeEventListener('focus', recheckWhenVisible);
      document.removeEventListener('visibilitychange', recheckWhenVisible);
    };
  }, []);

  return (
    <>
      {/* Tras HTTP 401, retirar las tablas del DOM, no solo superponer un modal. */}
      {!expired && children}
      <SessionExpiredDialog />
    </>
  );
}
