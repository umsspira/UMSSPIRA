'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings } from 'lucide-react';

/** Acceso persistente a configuración PWA desde cualquier pantalla de la aplicación. */
export function PortalSettingsShortcut() {
  const pathname = usePathname();

  if (pathname === '/portal/configuracion') return null;

  return (
    <Link
      href="/portal/configuracion"
      aria-label="Abrir configuración de la aplicación"
      title="Configuración de la aplicación"
      className="fixed bottom-4 right-4 z-[70] flex min-h-12 items-center gap-2 rounded-full bg-[#1B2632] px-4 py-3 font-medium text-white shadow-lg transition-colors hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB162]"
    >
      <Settings className="h-5 w-5" aria-hidden="true" />
      <span>Configuración</span>
    </Link>
  );
}
