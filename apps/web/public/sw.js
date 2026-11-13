
/*
 * UMSSPIRA - Service Worker
 * HU04 - Tarea #404: almacenamiento en caché de rutas
 */

const VERSION = 'v5';

const CACHE_NAME = 'umsspira-core-portal-v5';
const STATIC_CACHE = `umsspira-static-${VERSION}`;
const ASSETS_CACHE = `umsspira-assets-${VERSION}`;
const CONFIG_CACHE = `umsspira-config-${VERSION}`;
const ROUTES_CACHE = `umsspira-routes-${VERSION}`;

const ALL_CACHES = [
  CACHE_NAME,
  STATIC_CACHE,
  ASSETS_CACHE,
  CONFIG_CACHE,
  ROUTES_CACHE,
];

const CORE_ASSETS = ['/portal'];

const PRECACHE_URLS = [
  '/offline',
  '/offline-secciones.html',
  '/manifest.webmanifest',
  '/favicon.ico',
];

const PRECACHE_ICONS = [
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/favicon-32.png',
];

const MAX_ASSETS_ENTRIES = 80;
const MAX_ROUTES_ENTRIES = 20;

const PROFILES = {
  default: { maxAssets: 80 },
  desktop: { maxAssets: 200 },
  mobile: { maxAssets: 40 },
};

const DEFAULT_PROFILE = 'default';
const PROFILE_KEY = '/__sw-profile';

const IS_LOCALHOST =
  self.location.hostname === 'localhost' ||
  self.location.hostname === '127.0.0.1';

const EXT = (self.UMSSPIRA_SW = {
  routes: [],
  messages: {},
});

try {
  if (typeof importScripts === 'function') {
    importScripts('/sw-extensions.js');
  }
} catch (error) {
  console.warn('No se pudieron cargar las extensiones SW', error);
}





const PRIVATE_ROUTE_PREFIXES = [
  '/portal/mensajes',
  '/portal/perfil',
  '/portal/configuracion',
  '/portal/admin',
  '/portal/notificaciones',
  '/portal/administracion',
  '/api',
  '/auth',
];

function isPrivateRoute(pathname) {
  return PRIVATE_ROUTE_PREFIXES.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(`${prefix}/`)
  );
}




const OFFLINE_ALLOWED_ROUTES = [
  '/portal',
  '/portal/eventos',
  '/portal/empleos',
  '/portal/beneficios',
  '/portal/comunidad',
];


function isSafeOfflineRoute(request) {
  if (request.method !== 'GET') return false;
  if (request.mode !== 'navigate') return false;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return false;
  if (isPrivateRoute(url.pathname)) return false;
  if (request.headers.get('Authorization')) return false;
  if (url.search) return false;

  const pathname = url.pathname.replace(/\/$/, '') || '/';

  return OFFLINE_ALLOWED_ROUTES.includes(pathname);
}





function isCacheable(response) {
  return (
    response &&
    response.ok &&
    (response.type === 'basic' ||
      response.type === 'default')
  );
}

function canStoreNavigationResponse(response) {
  if (!isCacheable(response)) return false;

  if (response.redirected) return false;

  const contentType =
    response.headers.get('content-type') || '';

  const cacheControl =
    response.headers.get('cache-control') || '';

  if (!contentType.includes('text/html')) {
    return false;
  }

  if (/no-store|private/i.test(cacheControl)) {
    return false;
  }

  if (response.headers.has('set-cookie')) {
    return false;
  }

  return true;
}





async function precacheShellAssets(staticCache) {
  try {
    const response = await fetch('/portal');

    if (!response.ok) return;

    const html = await response.text();

    const urls = [
      ...new Set(
        html.match(/\/_next\/static\/[^"'\s)\\]+/g) || []
      ),
    ];

    await Promise.allSettled(
      urls.map(async (url) => {
        const res = await fetch(url);

        if (isCacheable(res)) {
          await staticCache.put(url, res);
        }
      })
    );
  } catch {
    // El precache no debe impedir la instalación.
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const coreCache = await caches.open(CACHE_NAME);

      // No precargar HTML del portal sin comprobar
      // primero si es seguro almacenarlo.
      await Promise.allSettled(
        CORE_ASSETS.map(async (url) => {
          const request = new Request(url, {
            credentials: 'omit',
            cache: 'no-store',
          });

          const response = await fetch(request);

          const pathname = new URL(url, self.location.origin).pathname;

          if (
            OFFLINE_ALLOWED_ROUTES.includes(pathname) &&
            !isPrivateRoute(pathname) &&
            canStoreNavigationResponse(response)
          ) {
            await coreCache.put(url, response.clone());
          }


        })
      );

      const staticCache = await caches.open(STATIC_CACHE);

      await Promise.allSettled(
        PRECACHE_URLS.map(async (url) => {
          const response = await fetch(url);

          if (isCacheable(response)) {
            await staticCache.put(url, response);
          }
        })
      );

      const assetsCache = await caches.open(ASSETS_CACHE);

      await Promise.allSettled(
        PRECACHE_ICONS.map(async (url) => {
          const response = await fetch(url);

          if (isCacheable(response)) {
            await assetsCache.put(url, response);
          }
        })
      );

      await precacheShellAssets(staticCache);
    })()
  );
});



self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();

      await Promise.all(
        names
          .filter(
            (name) =>
              name.startsWith('umsspira-') &&
              !ALL_CACHES.includes(name)
          )
          .map((name) => caches.delete(name))
      );

      await self.clients.claim();
    })()
  );
});



async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxEntries) {
    const excess = keys.length - maxEntries;

    await Promise.all(
      keys.slice(0, excess).map((key) => cache.delete(key))
    );
  }
}


function getHandledUrl(request) {
  if (request.method !== 'GET') return null;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return null;
  }

  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.includes('webpack-hmr') ||
    url.pathname === '/sw.js' ||
    url.pathname === '/sw-extensions.js'
  ) {
    return null;
  }

  if (
    request.mode === 'navigate' &&
    url.pathname !== '/portal' &&
    !url.pathname.startsWith('/portal/')
  ) {
    return null;
  }

  if (request.headers.get('Authorization')) {
    return null;
  }

  if (
    url.pathname !== '/portal' &&
    !url.pathname.startsWith('/portal/') &&
    !url.pathname.startsWith('/_next/static/') &&
    !url.pathname.startsWith('/_next/image') &&
    !url.pathname.startsWith('/icons/') &&
    url.pathname !== '/manifest.webmanifest'
  ) {
    return null;
  }

  return url;
}


async function handleNavigation(request) {
  const canCache = isSafeOfflineRoute(request);

  try {
    const response = await fetch(request);

    if (
      canCache &&
      canStoreNavigationResponse(response)
    ) {
      const cache = await caches.open(ROUTES_CACHE);

      await cache.put(request, response.clone());

      await trimCache(
        ROUTES_CACHE,
        MAX_ROUTES_ENTRIES
      );
    }

    return response;
  } catch {
    if (canCache) {
      const cache = await caches.open(ROUTES_CACHE);

      const cachedPage = await cache.match(request);

      if (cachedPage) {
        return cachedPage;
      }

      // Compatibilidad con la precarga inicial.
      const coreCache = await caches.open(CACHE_NAME);
      const corePage = await coreCache.match('/portal');

      if (corePage) {
        return corePage;
      }
    }

    if (canCache) {
      const offlineSections = await caches.match(
        '/offline-secciones.html'
      );

      if (offlineSections) {
        return offlineSections;
      }
    }

    const offlinePage = await caches.match('/offline');

    if (offlinePage) {
      return offlinePage;
    }

    return new Response(
      `<!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8">
          <meta name="viewport"
                content="width=device-width, initial-scale=1">
          <title>Sin conexión | UMSSPIRA</title>
        </head>
        <body style="font-family:sans-serif;padding:2rem">
          <h1>Sin conexión a Internet</h1>
          <p>
            Esta página no está disponible sin conexión.
          </p>
          <button onclick="location.reload()">
            Reintentar
          </button>
        </body>
      </html>`,
      {
        status: 503,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      }
    );
  }
}


async function saveProfile(name) {
  if (
    !Object.prototype.hasOwnProperty.call(
      PROFILES,
      name
    )
  ) {
    return;
  }

  const cache = await caches.open(CONFIG_CACHE);

  await cache.put(
    PROFILE_KEY,
    new Response(name)
  );
}

async function loadProfile() {
  const cache = await caches.open(CONFIG_CACHE);
  const response = await cache.match(PROFILE_KEY);

  if (!response) return DEFAULT_PROFILE;

  const name = await response.text();

  return Object.prototype.hasOwnProperty.call(
    PROFILES,
    name
  )
    ? name
    : DEFAULT_PROFILE;
}



async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);

    if (isCacheable(response)) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    const cached = await cache.match(request);

    if (cached) return cached;

    throw new Error(
      'Recurso no disponible sin conexión'
    );
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  const cached = await cache.match(request);

  if (cached) return cached;

  const response = await fetch(request);

  if (isCacheable(response)) {
    await cache.put(request, response.clone());
  }

  return response;
}

async function staleWhileRevalidate(
  request,
  cacheName,
  maxEntries
) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then(async (response) => {
      if (isCacheable(response)) {
        await cache.put(request, response.clone());

        await trimCache(cacheName, maxEntries);
      }

      return response;
    })
    .catch(() => undefined);

  return (
    cached ||
    (await networkPromise) ||
    new Response('', { status: 503 })
  );
}

/* ==========================================
   INTERCEPTAR SOLICITUDES
   ========================================== */

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Extensiones existentes de UMSSPIRA.
  for (const route of EXT.routes) {
    try {
      if (route.match(new URL(request.url), request)) {
        event.respondWith(route.handle(event));
        return;
      }
    } catch {
      // Una extensión no debe romper el núcleo.
    }
  }

  const url = getHandledUrl(request);

  if (!url) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  // No guardar respuestas dinámicas privadas.
  if (
    isPrivateRoute(url.pathname) ||
    request.headers.has('RSC') ||
    request.headers.has('Next-Router-State-Tree') ||
    url.searchParams.has('_rsc')
  ) {
    return;
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      IS_LOCALHOST
        ? networkFirst(request, STATIC_CACHE)
        : cacheFirst(request, STATIC_CACHE)
    );
    return;
  }

  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.startsWith('/_next/image')
  ) {
    event.respondWith(
      loadProfile().then((profile) =>
        staleWhileRevalidate(
          request,
          ASSETS_CACHE,
          PROFILES[profile].maxAssets
        )
      )
    );
    return;
  }

  // Solo los recursos públicos explícitamente
  // permitidos pueden utilizar la caché general.
  const allowedPublicResource =
    url.pathname === '/manifest.webmanifest' ||
    url.pathname.startsWith('/icons/');

  if (!allowedPublicResource) {
    return;
  }

  event.respondWith(
    networkFirst(request, CACHE_NAME).catch(async () => {
      const cached = await caches.match(request);

      if (cached) return cached;

      return new Response(
        'Recurso no disponible sin conexión',
        { status: 503 }
      );
    })
  );
});


self.addEventListener('message', (event) => {
  const data = event.data;

  if (!data) return;

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data.type === 'SET_DEVICE_PROFILE') {
    event.waitUntil(saveProfile(data.profile));
    return;
  }

  const handler = EXT.messages[data.type];

  if (typeof handler === 'function') {
    handler(event);
  }
});
