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

const PUSH_DEFAULT_TITLE = 'UMSSPIRA';
const PUSH_DEFAULT_ICON = '/icons/icon-192.png';
const PUSH_HOME = '/portal';

self.UMSSPIRA_SW = self.UMSSPIRA_SW || { routes: [], messages: {} };
self.UMSSPIRA_SW.routes = self.UMSSPIRA_SW.routes || [];

// Normaliza una ruta a una URL absoluta del mismo origen.
// Si el destino es externo o inválido, cae a la portada del portal.
function toInternalPushUrl(value) {
  const fallback = new URL(PUSH_HOME, self.location.origin).href;
  if (typeof value !== 'string' || value.trim().length === 0) return fallback;

  try {
    const destination = new URL(value, self.location.origin);
    if (destination.origin !== self.location.origin) {
      return fallback;
    }
    return destination.href;
  } catch {
    return fallback;
  }
}

// HU13 - T11: resuelve la ruta a abrir al tocar la notificación.
// Acepta una `url` interna provista por el servidor o un `eventId` para
// armar el detalle del evento. Siempre devuelve una URL del mismo origen.
function resolveNotificationTarget(data) {
  if (!data || typeof data !== 'object') return toInternalPushUrl(PUSH_HOME);

  if (typeof data.url === 'string' && data.url.length > 0) {
    return toInternalPushUrl(data.url);
  }

  if (typeof data.eventId === 'string' && data.eventId.trim() !== '') {
    return toInternalPushUrl(`/portal/eventos/${encodeURIComponent(data.eventId.trim())}`);
  }

  return toInternalPushUrl(PUSH_HOME);
}

function parsePushPayload(event) {
  try {
    const payload = event.data ? event.data.json() : {};
    return payload && typeof payload === 'object' ? payload : {};
  } catch {
    return {};
  }
}

self.addEventListener('push', (event) => {
  const payload = parsePushPayload(event);
  const title = typeof payload.title === 'string' && payload.title.trim()
    ? payload.title.trim()
    : PUSH_DEFAULT_TITLE;
  const body = typeof payload.body === 'string' ? payload.body : '';
  const icon = typeof payload.icon === 'string' && payload.icon.startsWith('/')
    ? payload.icon
    : PUSH_DEFAULT_ICON;
  const url = resolveNotificationTarget(payload);

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: PUSH_DEFAULT_ICON,
      data: { url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = resolveNotificationTarget(event.notification && event.notification.data);

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
      // 1. Si ya hay una ventana en la misma URL exacta, enfocarla directamente
      const exact = clients.find((client) => client.url === url);
      if (exact && typeof exact.focus === 'function') {
        await exact.focus();
        return;
      }

      // 2. Reutiliza una ventana de la app si ya está abierta en el mismo origen
      const existing = clients.find((client) => {
        try {
          return new URL(client.url).origin === self.location.origin;
        } catch {
          return false;
        }
      });

      if (existing) {
        try {
          // Navega la ventana existente al destino y la enfoca.
          if (typeof existing.navigate === 'function') {
            const navigated = await existing.navigate(url);
            const target = navigated || existing;
            if (typeof target.focus === 'function') await target.focus();
            return;
          }
          if (typeof existing.focus === 'function') {
            await existing.focus();
            return;
          }
        } catch {
          // Si la ventana existente no se puede navegar, se abre una nueva.
        }
      }

      // 3. Sin ventana reutilizable (o si falló), abre una nueva en el destino.
      if (typeof self.clients.openWindow === 'function') {
        await self.clients.openWindow(url);
      }
    }),
  );
});


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

