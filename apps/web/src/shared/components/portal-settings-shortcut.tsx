'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { useAuthStore } from '@/modules/auth/frontend/store';
import { isOfflineSessionValid } from '@/features/event-passes/offline/offline-session';

/** Pantallas donde nunca se muestra, aunque haya sesión (la propia configuración y el acceso). */
const HIDDEN_PATHS = ['/portal/configuracion', '/login', '/register'];

/**
 * Acceso a la configuración PWA. Solo aparece con una sesión iniciada (en línea) o con una sesión
 * offline vigente (HU07). Se muestra solo el icono; el texto aparece al pasar el mouse o con el teclado.
 */
export function PortalSettingsShortcut() {
  const pathname = usePathname();
  const auth = useAuthStore();
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const update = () => setHasSession(Boolean(auth.accessToken) || isOfflineSessionValid());
    update();
    // El cierre de sesión borra la marca offline y avisa con este evento.
    window.addEventListener('umsspira:session-cleared', update);
    window.addEventListener('storage', update);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    window.addEventListener('focus', update);
    // El inicio de sesión guarda la marca offline de forma asíncrona: se vuelve a mirar un instante después.
    const retry = window.setTimeout(update, 1500);
    return () => {
      window.clearTimeout(retry);
      window.removeEventListener('umsspira:session-cleared', update);
      window.removeEventListener('storage', update);
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      window.removeEventListener('focus', update);
    };
  }, [auth.accessToken, pathname]);

  if (!hasSession) return null;
  if (HIDDEN_PATHS.some((path) => pathname === path || pathname?.startsWith(`${path}/`))) return null;

  return (
    <Link
      href="/portal/configuracion"
      aria-label="Abrir configuración de la aplicación"
      title="Configuración de la aplicación"
      data-testid="portal-config-button"
      className="group fixed bottom-4 right-4 z-[70] flex h-11 items-center overflow-hidden rounded-full bg-[#1B2632]/60 px-3 text-white shadow-md backdrop-blur-sm transition-all duration-200 hover:bg-[#1B2632] hover:shadow-lg focus-visible:bg-[#1B2632] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB162] sm:bottom-6 sm:right-6"
    >
      <Settings className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span
        aria-hidden="true"
        className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-medium opacity-0 transition-all duration-200 group-hover:ml-2 group-hover:max-w-[8rem] group-hover:opacity-100 group-focus-visible:ml-2 group-focus-visible:max-w-[8rem] group-focus-visible:opacity-100"
      >
        Configuración
      </span>
    </Link>
  );
}
