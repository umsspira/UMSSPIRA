/**
 * Extensiones del Service Worker (se carga con importScripts desde sw.js).
 * Eventos (QR offline) y Chat (Push) agregan aquí sus handlers, sin tocar sw.js.
 *
 * Ejemplos:
 *   self.UMSSPIRA_SW.routes.push({
 *     match: (url) => url.pathname.startsWith('/portal/eventos/qr'),
 *     handle: (event) => fetch(event.request),
 *   });
 *   self.UMSSPIRA_SW.messages.MI_MENSAJE = (event) => { ... };
 *   self.addEventListener('push', (event) => { ... });
 */


// HU12: acceso al detalle del pase sin conexión
const HU12_SHELL_CACHE = 'hu12-offline-shell-v1';
const HU12_SHELL_URL = '/mis-pases/offline';
const HU12_STATIC_CACHE = 'umsspira-static-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        // La página de apoyo no contiene datos personales.
        const response = await fetch(HU12_SHELL_URL, {
          credentials: 'omit',
          cache: 'no-store',
        });

        if (!response.ok || response.redirected) return;

        const html = await response.clone().text();
        const shellCache = await caches.open(HU12_SHELL_CACHE);
        await shellCache.put(HU12_SHELL_URL, response);

        // Guardar los archivos de Next necesarios para mostrar la página.
        const urls = [...new Set(
          html.match(/\/_next\/static\/[^"'\s)\\]+/g) || []
        )];

        const staticCache = await caches.open(HU12_STATIC_CACHE);
        await Promise.allSettled(
          urls.map(async (url) => {
            const asset = await fetch(url, { credentials: 'omit' });
            if (asset.ok) await staticCache.put(url, asset);
          })
        );
      } catch {
        // Si no se pudo preparar, la aplicación seguirá funcionando en línea.
      }
    })()
  );
});

self.UMSSPIRA_SW.routes.push({
  match: (url, request) =>
    url.origin === self.location.origin &&
    request.method === 'GET' &&
    request.mode === 'navigate' &&
    /^\/mis-pases\/[^/]+\/?$/.test(url.pathname) &&
    url.pathname !== HU12_SHELL_URL,

  handle: async (event) => {
    try {
      return await fetch(event.request);
    } catch {
      const cache = await caches.open(HU12_SHELL_CACHE);
      const shell = await cache.match(HU12_SHELL_URL);

      return shell || new Response(
        'No se pudo abrir el pase sin conexión. Conéctate e inténtalo nuevamente.',
        {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        }
      );
    }
  },
});
