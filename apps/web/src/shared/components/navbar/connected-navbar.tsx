'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { authStore, useAuthStore } from '@/modules/auth/frontend/store';
import { clearSession } from '@/modules/auth/frontend/services/session';
import { notifySessionExpired } from '@/modules/auth/frontend/services/session-expired';
import { authenticatedFetch, clearAccessToken, revokeCurrentSession, SessionError } from '@/shared/services/auth-session';
import { clearPrivateOfflineData, isOfflineSessionValid, markPendingLogout } from '@/features/event-passes/offline/offline-session';
import { Navbar } from './navbar';
import { NAVBAR_ROLE_LABEL } from './navigation';
import { NAVBAR_OFFLINE_USER_KEY } from './offline-user';
import type { NavbarRole, NavbarSession } from './types';
import { clearAllSurveyDrafts } from '@/modules/surveys/frontend/hooks/use-survey-draft';
import { clearAllProfileDrafts } from '@/modules/profile/utils/drafts-storage';
import { useEventNotifications } from '@/features/notifications/hooks/use-event-notifications';
import { EventNotificationToast } from './event-notification-toast';

const roles: NavbarRole[] = ['titulado', 'empresa', 'administrador'];

/**
 * Sin conexión (o con el servidor caído) la barra no puede preguntar quién eres. Si la sesión offline
 * sigue vigente (HU07, 7 días, sin cierre pendiente) se usa el último usuario recordado en este equipo.
 */
function offlineSessionFromStorage(): NavbarSession | null {
  try {
    if (!isOfflineSessionValid()) return null;
    const raw = window.localStorage.getItem(NAVBAR_OFFLINE_USER_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as Partial<NavbarSession>;
    if (!roles.includes(user.role as NavbarRole) || typeof user.name !== 'string' || typeof user.initials !== 'string') return null;
    return { name: user.name, initials: user.initials, role: user.role as NavbarRole };
  } catch {
    return null;
  }
}

/** Sin red o con el servidor caído no se puede avisar al servidor: el cierre se hace en este equipo. */
function cannotReachServer(error: unknown): boolean {
  return (
    (typeof navigator !== 'undefined' && !navigator.onLine) ||
    error instanceof TypeError ||
    (error instanceof SessionError && error.status >= 500)
  );
}

function sessionFromUser(value: unknown): NavbarSession | null {
  if (!value || typeof value !== 'object') return null;
  const user = value as { email?: unknown; role?: unknown };
  if (!roles.includes(user.role as NavbarRole)) return null;
  const role = user.role as NavbarRole;
  // El contrato actual de /me entrega email y rol, no un nombre completo.
  const name = typeof user.email === 'string' && user.email ? user.email.split('@')[0] : NAVBAR_ROLE_LABEL[role];
  const words = name.split(/[\s._-]+/).filter(Boolean);
  const initials = words.length > 1 ? `${words[0][0]}${words[1][0]}` : name.slice(0, 2);
  return { name, role, initials: initials.toUpperCase() };
}

function rememberNavbarUser(value: NavbarSession | null) {
  try {
    if (value) window.localStorage.setItem(NAVBAR_OFFLINE_USER_KEY, JSON.stringify({ name: value.name, initials: value.initials, role: value.role }));
    else window.localStorage.removeItem(NAVBAR_OFFLINE_USER_KEY);
  } catch { /* almacenamiento deshabilitado: la pantalla sin conexión usa la barra de visitante */ }
}

// Última sesión conocida: sobrevive a los cambios de página (el componente se vuelve a montar)
// para que la barra de visitante nunca parpadee mientras se revalida la sesión.
let cachedSession: NavbarSession | null | undefined;

/** Solo para pruebas: olvida la última sesión conocida. */
export function resetConnectedNavbarCache() { cachedSession = undefined; }

/** Adaptador real. Nunca consume la sesión ficticia del laboratorio. */
export function ConnectedNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuthStore();
  // undefined = todavía no se sabe (no se muestra ninguna barra de cuenta ni de visitante)
  const [session, setSessionState] = useState<NavbarSession | null | undefined>(cachedSession);
  const [logoutError, setLogoutError] = useState(false);
  const { items: notifications, error: notificationsError, markRead, refresh, toast, dismissToast } =
    useEventNotifications(session?.role === 'titulado');
  // HU-004 CA-07: durante el cierre voluntario, el 401 de /me no debe redirigir por su cuenta.
  const loggingOut = useRef(false);

  const setSession = useCallback((value: NavbarSession | null) => {
    cachedSession = value;
    rememberNavbarUser(value);
    setSessionState(value);
  }, []);

  // Un fallo que no es 401/403 (red, 500) conserva la sesión que ya se tenía.
  const keepOrGuest = useCallback(() => {
    setSessionState(previous => {
      const next = previous === undefined ? offlineSessionFromStorage() : previous;
      cachedSession = next;
      return next;
    });
  }, []);

  useEffect(() => {
    let request: AbortController | undefined;
    let disposed = false;
    const invalidateSession = () => {
      if (loggingOut.current) return;
      // HU-004 CA-05: un rechazo 401/403 no debe dejar el estado React autenticado.
      clearSession();
      authStore.reset();
      setSession(null);
      // El portal institucional público puede mostrarse sin sesión;
      // reportería, en cambio, avisa con una ventana de alerta y vuelve a /login (CA-06).
      if (pathname === '/reports' || pathname?.startsWith('/reports/')) {
        notifySessionExpired();
      }
    };
    const synchronize = async () => {
      request?.abort();
      const controller = new AbortController();
      request = controller;
      try {
        const response = await authenticatedFetch('/api/v1/auth/me', {
          signal: controller.signal,
          cache: 'no-store',
        });
        const body: { data?: unknown } = response.ok ? await response.json() : {};
        if (!disposed && !controller.signal.aborted) {
          if (response.status === 401 || response.status === 403) invalidateSession();
          else if (response.ok) setSession(sessionFromUser(body.data));
          else keepOrGuest();
        }
      } catch (error) {
        if (!disposed && !controller.signal.aborted) {
          if (error instanceof SessionError && (error.status === 401 || error.status === 403)) invalidateSession();
          else keepOrGuest();
        }
      }
    };
    void synchronize();
    window.addEventListener('focus', synchronize);
    window.addEventListener('storage', synchronize);
    window.addEventListener('online', synchronize);
    return () => {
      disposed = true;
      request?.abort();
      window.removeEventListener('focus', synchronize);
      window.removeEventListener('storage', synchronize);
      window.removeEventListener('online', synchronize);
    };
  }, [pathname, auth.accessToken, router, setSession, keepOrGuest]);

  const logout = async () => {
    loggingOut.current = true;
    setLogoutError(false);
    try {
      await revokeCurrentSession();
      clearAllSurveyDrafts();
      clearAllProfileDrafts();
      clearSession();
      authStore.reset();
      setSession(null);
      // HU-004: el administrador regresa a la bienvenida institucional.
      router.push(session?.role === 'administrador' ? '/' : '/login');
      router.refresh();
    } catch (error) {
      if (cannotReachServer(error)) {
        // HU07: sin conexión sí se puede salir. Se borran los datos privados y el cierre queda pendiente.
        markPendingLogout();
        await clearPrivateOfflineData();
        clearAccessToken();
        clearAllSurveyDrafts();
        clearAllProfileDrafts();
        clearSession();
        authStore.reset();
        setSession(null);
        router.push('/login');
        return;
      }
      loggingOut.current = false;
      setLogoutError(true);
    }
  };

  // /portal/institucional es la portada pública: siempre muestra la barra de visitante
  // (Iniciar sesión / Registro). La barra por rol solo se ve en el resto del portal.
  const isPublicLanding = pathname === '/portal/institucional' || pathname?.startsWith('/portal/institucional/');

  return (
    <>
      <Navbar
        session={isPublicLanding ? null : (session ?? null)}
        loading={!isPublicLanding && session === undefined}
        onLogout={logout}
        notifications={notifications}
        onNotificationsOpen={() => void refresh()}
        notificationsError={notificationsError}
        onNotificationRead={markRead}
      />
      <EventNotificationToast item={toast} onClose={dismissToast} />
      {logoutError && <p role="alert">No se pudo cerrar la sesión. Inténtalo nuevamente.</p>}
    </>
  );
}
