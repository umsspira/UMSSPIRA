'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { authStore, useAuthStore } from '@/modules/auth/frontend/store';
import { clearSession } from '@/modules/auth/frontend/services/session';
import { notifySessionExpired } from '@/modules/auth/frontend/services/session-expired';
import { authenticatedFetch, revokeCurrentSession, SessionError } from '@/shared/services/auth-session';
import { Navbar } from './navbar';
import { NAVBAR_ROLE_LABEL } from './navigation';
import type { NavbarRole, NavbarSession } from './types';
import { clearAllSurveyDrafts } from '@/modules/surveys/frontend/hooks/use-survey-draft';

const roles: NavbarRole[] = ['titulado', 'empresa', 'administrador'];
const navbarSessionCacheKey = 'umsspira.navbar.display-session';

function readCachedNavbarSession(): NavbarSession | null {
  try {
    const raw = window.sessionStorage.getItem(navbarSessionCacheKey);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<NavbarSession>;
    if (
      typeof value.name !== 'string' ||
      typeof value.initials !== 'string' ||
      !roles.includes(value.role as NavbarRole)
    ) return null;
    return { name: value.name, initials: value.initials, role: value.role as NavbarRole };
  } catch {
    return null;
  }
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

/** Adaptador real. Nunca consume la sesión ficticia del laboratorio. */
export function ConnectedNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuthStore();
  const [session, setSession] = useState<NavbarSession | null>(null);
  const sessionRef = useRef<NavbarSession | null>(null);
  const [logoutError, setLogoutError] = useState(false);
  // HU-004 CA-07: durante el cierre voluntario, el 401 de /me no debe redirigir por su cuenta.
  const loggingOut = useRef(false);

  const updateSession = useCallback((next: NavbarSession | null) => {
    sessionRef.current = next;
    setSession(next);
    try {
      if (next) {
        window.sessionStorage.setItem(navbarSessionCacheKey, JSON.stringify({
          name: next.name,
          initials: next.initials,
          role: next.role,
        }));
      } else {
        window.sessionStorage.removeItem(navbarSessionCacheKey);
      }
    } catch { /* El almacenamiento de sesión puede estar deshabilitado. */ }
  }, []);

  useEffect(() => {
    let request: AbortController | undefined;
    let disposed = false;
    const invalidateSession = () => {
      if (loggingOut.current) return;
      // HU-004 CA-05: un rechazo 401 no debe dejar el estado React autenticado.
      clearSession();
      authStore.reset();
      updateSession(null);
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
      if (!sessionRef.current) {
        const cached = readCachedNavbarSession();
        if (cached) {
          sessionRef.current = cached;
          setSession(cached);
        }
      }
      try {
        const response = await authenticatedFetch('/api/v1/auth/me', {
          signal: controller.signal,
          cache: 'no-store',
        });
        const body: { data?: unknown } = response.ok ? await response.json() : {};
        if (!disposed && !controller.signal.aborted) {
          if (response.status === 401 || response.status === 403) invalidateSession();
          else if (response.ok) {
            const next = sessionFromUser(body.data);
            if (next) updateSession(next);
          }
        }
      } catch (error) {
        if (!disposed && !controller.signal.aborted) {
          if (error instanceof SessionError && (error.status === 401 || error.status === 403)) invalidateSession();
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
  }, [pathname, auth.accessToken, router, updateSession]);

  const logout = async () => {
    loggingOut.current = true;
    setLogoutError(false);
    try {
      await revokeCurrentSession();
      clearAllSurveyDrafts();
      clearSession();
      authStore.reset();
      updateSession(null);
      // HU-004: el administrador regresa a la bienvenida institucional.
      router.push(session?.role === 'administrador' ? '/' : '/login');
      router.refresh();
    } catch {
      loggingOut.current = false;
      setLogoutError(true);
    }
  };

  return <><Navbar session={session} onLogout={logout} />{logoutError && <p role="alert">No se pudo cerrar la sesión. Inténtalo nuevamente.</p>}</>;
}
