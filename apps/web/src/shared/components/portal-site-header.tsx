'use client';

import { ConnectedNavbar } from '@/shared/components/navbar/index';

// Encabezado único del portal: todas las páginas del portal (inicio, eventos,
// mensajes, institucional, etc.) usan la misma barra de navegación oficial.
export function PortalSiteHeader() {
  return <ConnectedNavbar />;
}
