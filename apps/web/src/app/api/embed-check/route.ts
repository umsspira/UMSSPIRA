import { lookup } from 'node:dns/promises';
import type { NextRequest } from 'next/server';

import { framingBlockedByHeaders, isHttpsUrl, isPrivateAddress } from '@/modules/profile/utils/project-embed';

// HU-20: el navegador no avisa cuando un sitio bloquea el iframe y muestra su propia página de error.
// Este punto consulta solo las cabeceras del sitio del proyecto para saber si se deja mostrar dentro de la ventana.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_REDIRECTS = 3;

async function isPublicHttpsUrl(url: string): Promise<boolean> {
  if (!isHttpsUrl(url)) return false;
  const { hostname, port } = new URL(url);
  if (port && port !== '443') return false;
  try {
    const addresses = await lookup(hostname, { all: true });
    return addresses.length > 0 && addresses.every(({ address }) => !isPrivateAddress(address));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const origin = request.headers.get('origin');
  if ((origin && origin !== request.nextUrl.origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
    return Response.json({ error: { code: 'FORBIDDEN', message: 'Origen no permitido' } }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
  let url = typeof body?.url === 'string' ? body.url : '';
  const noStore = { headers: { 'Cache-Control': 'no-store' } };

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      // Cada salto se revisa de nuevo: solo https y nunca direcciones internas
      if (!(await isPublicHttpsUrl(url))) return Response.json({ embeddable: null }, noStore);
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
        headers: { accept: 'text/html' },
      });
      await response.body?.cancel();
      const location = response.headers.get('location');
      if (response.status >= 300 && response.status < 400 && location) {
        url = new URL(location, url).toString();
        continue;
      }
      const blocked = framingBlockedByHeaders(
        response.headers.get('x-frame-options'),
        response.headers.get('content-security-policy'),
        request.nextUrl.origin,
      );
      return Response.json({ embeddable: !blocked }, noStore);
    }
  } catch {
    // Sin respuesta del sitio: la ventana sigue con su espera normal
  }
  return Response.json({ embeddable: null }, noStore);
}
