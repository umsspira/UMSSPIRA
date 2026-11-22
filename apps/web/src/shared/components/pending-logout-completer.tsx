'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { authStore } from '@/modules/auth/frontend/store';
import { clearSession } from '@/modules/auth/frontend/services/session';
import { completePendingLogout } from '@/shared/services/auth-session';
import { hasPendingLogout } from '@/features/event-passes/offline/offline-session';

const PUBLIC_PATHS = ['/login', '/register', '/portal/institucional', '/offline'];

/**
 * HU07: si la persona cerró sesión sin conexión, el servidor aún no lo sabe. Al abrir la aplicación
 * con red, o cuando la red vuelve, se completa el cierre (se revoca la sesión) y se limpia el estado local.
 */
export function PendingLogoutCompleter() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!hasPendingLogout()) return;
      const done = await completePendingLogout();
      if (!active || !done) return;
      clearSession();
      authStore.reset();
      if (!PUBLIC_PATHS.some((p) => pathname === p || pathname?.startsWith(`${p}/`))) router.replace('/login');
    };
    void run();
    window.addEventListener('online', run);
    return () => {
      active = false;
      window.removeEventListener('online', run);
    };
  }, [pathname, router]);

  return null;
}
