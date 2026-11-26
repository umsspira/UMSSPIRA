'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authStore, useAuthStore } from '@/modules/auth/frontend/store';
import { clearSession } from '@/modules/auth/frontend/services/session';
import { clearAccessToken, revokeCurrentSession, SessionError } from '@/shared/services/auth-session';
import { clearPrivateOfflineData, isOfflineSessionValid, markPendingLogout } from '@/features/event-passes/offline/offline-session';
import { clearAllSurveyDrafts } from '@/modules/surveys/frontend/hooks/use-survey-draft';
import { clearAllProfileDrafts } from '@/modules/profile/utils/drafts-storage';

/** Sin red o con el servidor caído no se puede avisar al servidor: el cierre se hace en este equipo. */
function cannotReachServer(error: unknown): boolean {
  return (
    (typeof navigator !== 'undefined' && !navigator.onLine) ||
    error instanceof TypeError ||
    (error instanceof SessionError && error.status >= 500)
  );
}

/**
 * Botón «Cerrar sesión» para la pantalla «Sin conexión». Solo se ve con una sesión iniciada
 * (o una sesión offline vigente, HU07). Usa el mismo cierre que la barra: borra los datos privados
 * del dispositivo y deja el cierre pendiente para cuando vuelva la red.
 */
export function OfflineLogoutButton() {
  const router = useRouter();
  const auth = useAuthStore();
  const [hasSession, setHasSession] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const update = () => setHasSession(Boolean(auth.accessToken) || isOfflineSessionValid());
    update();
    window.addEventListener('storage', update);
    return () => window.removeEventListener('storage', update);
  }, [auth.accessToken]);

  // Con la sesión ya cerrada, al volver la red se lleva a /login (sin red no hay a dónde ir).
  useEffect(() => {
    if (!done) return;
    const goLogin = () => router.push('/login');
    if (navigator.onLine) goLogin();
    window.addEventListener('online', goLogin);
    return () => window.removeEventListener('online', goLogin);
  }, [done, router]);

  const logout = async () => {
    setBusy(true);
    setError(false);
    try {
      if (!navigator.onLine) throw new TypeError('offline');
      await revokeCurrentSession();
    } catch (e) {
      if (!cannotReachServer(e)) {
        setBusy(false);
        setError(true);
        return;
      }
      // HU07: sin conexión sí se puede salir. Se borran los datos privados y el cierre queda pendiente.
      markPendingLogout();
      await clearPrivateOfflineData();
      clearAccessToken();
    }
    clearAllSurveyDrafts();
    clearAllProfileDrafts();
    clearSession();
    authStore.reset();
    setBusy(false);
    setDone(true);
  };

  if (done) {
    return (
      <p role="status" className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-[#1B2632]">
        Sesión cerrada. Tus datos privados se borraron de este dispositivo. Inicia sesión cuando tengas conexión.
      </p>
    );
  }

  if (!hasSession) return null;

  return (
    <>
      <button
        type="button"
        onClick={logout}
        disabled={busy}
        data-testid="offline-page-logout"
        className="flex min-h-[44px] w-full items-center rounded-xl bg-white px-4 py-3 text-left text-sm font-medium text-[#1B2632] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB162] disabled:opacity-60"
      >
        {busy ? 'Cerrando sesión…' : 'Cerrar sesión'}
      </button>
      {error && <p role="alert" className="text-sm text-red-700">No se pudo cerrar la sesión. Inténtalo nuevamente.</p>}
    </>
  );
}
