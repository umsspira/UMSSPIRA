const VERSION = 'v9.0.0';

const CACHE_NAME = `umsspira-core-portal-${VERSION}`;
const STATIC_CACHE = `umsspira-static-${VERSION}`;
const ASSETS_CACHE = `umsspira-assets-${VERSION}`;
const CONFIG_CACHE = `umsspira-config-${VERSION}`;
const ROUTES_CACHE = `umsspira-routes-${VERSION}`;

const ALL_CACHES = [CACHE_NAME, STATIC_CACHE, ASSETS_CACHE, CONFIG_CACHE, ROUTES_CACHE];
const PRECACHE_URLS = ['/manifest.webmanifest', '/favicon.ico'];
const PRECACHE_ICONS = ['/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png', '/icons/favicon-32.png'];

const PROFILES = { default: { maxAssets: 80 }, desktop: { maxAssets: 200 }, mobile: { maxAssets: 40 } };
const DEFAULT_PROFILE = 'default';
const PROFILE_KEY = '/__sw-profile';
const IS_LOCALHOST = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

const EXT = (self.UMSSPIRA_SW = { routes: [], messages: {} });
try { if (typeof importScripts === 'function') importScripts('/sw-extensions.js'); } catch (e) { console.warn(e); }

const PRIVATE_ROUTE_PREFIXES = ['/portal/mensajes', '/portal/perfil', '/portal/configuracion', '/portal/admin', '/portal/notificaciones', '/portal/administracion', '/api', '/auth'];
function isPrivateRoute(pathname) { return PRIVATE_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)); }

// Páginas que se guardan para verse sin conexión (las 2 opciones de la pantalla offline)
const OFFLINE_ROUTE_PREFIXES = ['/events/catalog/passes', '/portal/eventos'];
const OFFLINE_ROOT_ROUTES = ['/events/catalog/passes', '/portal/eventos'];
function isOfflineRoute(pathname) {
  if (OFFLINE_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  // Cualquier otra ruta de pases (por si la pantalla real de Mis QR tiene otra URL)
  return /\/(passes|pases)(\/|$)/.test(pathname);
}

function isCacheable(response) { return response && response.ok && (response.type === 'basic' || response.type === 'default'); }

// Clave estable: siempre el pathname, sin query ni headers
function routeKey(pathname) { return new Request(new URL(pathname, self.location.origin).href); }

// Una respuesta con redirected=true no se puede servir a una navegación: se crea una limpia.
async function cleanResponse(response) {
  if (!response.redirected) return response;
  const body = await response.blob();
  return new Response(body, {
    status: 200,
    statusText: 'OK',
    headers: { 'Content-Type': response.headers.get('content-type') || 'text/html; charset=utf-8' },
  });
}

// Guardamos el HTML real; solo rechazamos si terminó en una página de login/auth.
function canStoreOfflineRoute(response) {
  if (!isCacheable(response)) return false;
  if (!(response.headers.get('content-type') || '').includes('text/html')) return false;
  try {
    const finalPath = new URL(response.url).pathname;
    if (finalPath === '/login' || finalPath.startsWith('/login/') || finalPath.startsWith('/auth')) return false;
  } catch (e) { return false; }
  return true;
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
}

// Descarga la página completa de una ruta y la guarda junto con sus scripts/estilos
async function storeRouteHtml(pathname) {
  try {
    const response = await fetch(pathname, {
      credentials: 'same-origin',
      redirect: 'follow',
      cache: 'no-store',
      headers: { Accept: 'text/html' },
    });
    if (!canStoreOfflineRoute(response)) {
      console.warn('[SW] No se guardó', pathname, response.status, response.type, response.url);
      return false;
    }

    const html = await response.clone().text();
    const clean = await cleanResponse(response.clone());
    const cache = await caches.open(ROUTES_CACHE);
    await cache.put(routeKey(pathname), clean);
    await trimCache(ROUTES_CACHE, 20);

    const urls = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) || [])];
    const staticCache = await caches.open(STATIC_CACHE);
    await Promise.allSettled(urls.map(async (u) => {
      if (await staticCache.match(u)) return;
      const res = await fetch(u);
      if (isCacheable(res)) await staticCache.put(u, res);
    }));
    return true;
  } catch (e) {
    console.warn('[SW] Error guardando', pathname, e);
    return false;
  }
}

async function syncOfflineRoutes() {
  await Promise.allSettled(OFFLINE_ROOT_ROUTES.map((r) => storeRouteHtml(r)));
}

// Evita descargar lo mismo muchas veces seguidas
const lastSync = new Map();
function shouldSync(key, ms) {
  const now = Date.now();
  const last = lastSync.get(key) || 0;
  if (now - last < ms) return false;
  lastSync.set(key, now);
  return true;
}

async function precacheShellAssets(staticCache) {
  try {
    const response = await fetch('/portal');
    if (!response.ok) return;
    const html = await response.text();
    const urls = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) || [])];
    await Promise.allSettled(urls.map(async (url) => {
      const res = await fetch(url);
      if (isCacheable(res)) await staticCache.put(url, res);
    }));
  } catch (e) { /* silencioso */ }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const staticCache = await caches.open(STATIC_CACHE);

    await Promise.allSettled(PRECACHE_URLS.map(async (url) => {
      try {
        const response = await fetch(url);
        if (isCacheable(response)) await staticCache.put(url, response);
      } catch (e) {}
    }));

    const assetsCache = await caches.open(ASSETS_CACHE);
    await Promise.allSettled(PRECACHE_ICONS.map(async (url) => {
      try {
        const response = await fetch(url);
        if (isCacheable(response)) await assetsCache.put(url, response);
      } catch (e) {}
    }));

    await precacheShellAssets(staticCache);
    await syncOfflineRoutes();
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith('umsspira-') && !ALL_CACHES.includes(name)).map((name) => caches.delete(name)));
    await self.clients.claim();
    await syncOfflineRoutes();
  })());
});

function getHandledUrl(request) {
  if (request.method !== 'GET') return null;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return null;
  if (['/api/', '/auth/'].some(p => url.pathname.startsWith(p)) || url.pathname.includes('webpack-hmr') || url.pathname === '/sw.js' || url.pathname === '/sw-extensions.js') return null;
  if (request.headers.get('Authorization')) return null;
  return url;
}

// --- PÁGINA SIN CONEXIÓN (HTML autónomo, no depende de Next.js) ---
function offlineHtml() {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sin conexión · UMSSPIRA</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#EEE9DF;
       font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1B2632;padding:24px;text-align:center}
  .wrap{width:100%;max-width:28rem}
  .card{background:#fff;border-radius:2rem;padding:2.5rem 2rem;box-shadow:0 8px 30px rgba(0,0,0,.06)}
  .icon{width:96px;height:96px;margin:0 auto 24px;border-radius:50%;background:#FFF7ED;display:flex;align-items:center;justify-content:center}
  h1{margin:0 0 12px;font-size:1.75rem}
  p{margin:0 0 28px;font-size:.95rem;line-height:1.6;color:rgba(44,56,77,.8)}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:28px}
  .opt{display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 8px;border-radius:12px;
       border:1px solid #f1f1f1;background:#f9fafb;color:#1B2632;text-decoration:none;font-size:.8rem;font-weight:600}
  .opt:hover{background:rgba(255,177,98,.12);border-color:rgba(255,177,98,.4)}
  .btn{display:flex;width:100%;align-items:center;justify-content:center;gap:8px;border:0;border-radius:12px;
       background:#FFB162;color:#1B2632;font-weight:700;font-size:1rem;padding:14px 24px;cursor:pointer;margin-bottom:12px}
  .btn:hover{background:#FFA044}
  .home{display:block;padding:12px;border-radius:12px;color:rgba(44,56,77,.6);text-decoration:none;font-size:.9rem;font-weight:600}
  .home:hover{background:rgba(0,0,0,.05);color:#1B2632}
  .foot{margin-top:28px;font-size:.75rem;color:rgba(44,56,77,.4);font-weight:500}
</style>
</head>
<body>
<main class="wrap">
  <div class="card">
    <div class="icon">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#EA580C" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="2" y1="2" x2="22" y2="22"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M2 8.82a15 15 0 0 1 4.17-2.65"/>
        <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76"/><path d="M16.85 11.25a10 10 0 0 1 2.22 1.68"/>
        <path d="M5 13a10 10 0 0 1 5.24-2.76"/><line x1="12" y1="20" x2="12.01" y2="20"/>
      </svg>
    </div>
    <h1 data-testid="offline-title">Sin conexión a Internet</h1>
    <p>Parece que no tienes conexión en este momento, pero no te preocupes. Aún puedes consultar tus códigos QR guardados y los eventos que visitaste.</p>
    <div class="grid">
      <a class="opt" href="/events/catalog/passes" data-testid="offline-link-passes">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EA580C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v.01M14 20v.01M20 20h.01M17 17v3"/></svg>
        Mis QR
      </a>
      <a class="opt" href="/portal/eventos" data-testid="offline-link-events">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EA580C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
        Eventos
      </a>
    </div>
    <button type="button" class="btn" data-testid="offline-retry" onclick="location.reload()">Reintentar conexión</button>
    <a class="home" href="/portal" data-testid="offline-link-home">Ir al inicio</a>
  </div>
  <div class="foot">UMSSPIRA · Tu comunidad, siempre conectada</div>
</main>
<script>
  // Al volver el internet, recarga la misma ruta que se había pedido
  window.addEventListener('online', function () { location.reload(); });
</script>
</body>
</html>`;
}

function offlineResponse() {
  return new Response(offlineHtml(), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

// --- NAVIGATION HANDLER ---
async function handleNavigation(event) {
  const request = event.request;
  const url = new URL(request.url);

  try {
    const response = await fetch(request);

    if (isOfflineRoute(url.pathname)) {
      // Guardar la propia respuesta de la navegación
      if (canStoreOfflineRoute(response)) {
        const copy = response.clone();
        event.waitUntil((async () => {
          try {
            const cache = await caches.open(ROUTES_CACHE);
            await cache.put(routeKey(url.pathname), await cleanResponse(copy));
            await trimCache(ROUTES_CACHE, 20);
          } catch (e) {}
        })());
      }
      if (shouldSync(`route:${url.pathname}`, 5_000)) event.waitUntil(storeRouteHtml(url.pathname));
    } else if (url.pathname.startsWith('/portal') && shouldSync('all-routes', 60_000)) {
      event.waitUntil(syncOfflineRoutes());
    }
    return response;
  } catch (e) {
    // SIN CONEXIÓN
    if (isOfflineRoute(url.pathname)) {
      const cache = await caches.open(ROUTES_CACHE);
      const cached =
        (await cache.match(routeKey(url.pathname), { ignoreSearch: true, ignoreVary: true })) ||
        (await cache.match(request, { ignoreSearch: true, ignoreVary: true }));
      if (cached) return cleanResponse(cached);
    }
    // Cualquier otra ruta (incluida /portal): pantalla "Sin conexión" con las 2 opciones
    return offlineResponse();
  }
}

async function saveProfile(name) {
  if (!PROFILES[name]) return;
  const cache = await caches.open(CONFIG_CACHE);
  await cache.put(PROFILE_KEY, new Response(name));
}

async function loadProfile() {
  const cache = await caches.open(CONFIG_CACHE);
  const response = await cache.match(PROFILE_KEY);
  return response ? await response.text() : DEFAULT_PROFILE;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (isCacheable(response)) await cache.put(request, response.clone());
    return response;
  } catch (e) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error('Recurso no disponible');
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (isCacheable(response)) await cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request).then(async (response) => {
    if (isCacheable(response)) {
      await cache.put(request, response.clone());
      await trimCache(cacheName, maxEntries);
    }
    return response;
  }).catch(() => undefined);
  return cached || (await networkPromise) || new Response('', { status: 503 });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.mode === 'navigate') {
    const navUrl = new URL(request.url);
    const esDelPortal =
      navUrl.origin === self.location.origin &&
      (navUrl.pathname === '/portal' ||
        navUrl.pathname.startsWith('/portal/') ||
        isOfflineRoute(navUrl.pathname));
    if (!esDelPortal) return; // homepage, /me, /graduates-report, /api/... pasan directo a la red
    event.respondWith(handleNavigation(event));
    return;
  }

  for (const route of EXT.routes) {
    try { if (route.match(new URL(request.url), request)) { event.respondWith(route.handle(event)); return; } } catch (e) {}
  }

  const url = getHandledUrl(request);
  if (!url) return;

  // Navegación del cliente de Next (links): no se intercepta, pero guardamos en segundo plano
  // el HTML completo de Mis QR / Eventos para uso sin conexión.
  const isClientNavigation =
    request.headers.has('RSC') || request.headers.has('Next-Router-State-Tree') || url.searchParams.has('_rsc');
  if (isClientNavigation) {
    if (isOfflineRoute(url.pathname) && shouldSync(`route:${url.pathname}`, 5_000)) {
      event.waitUntil(storeRouteHtml(url.pathname));
    }
    return;
  }

  if (isPrivateRoute(url.pathname)) return;

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(IS_LOCALHOST ? networkFirst(request, STATIC_CACHE) : cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (request.destination === 'image' || request.destination === 'font' || url.pathname.startsWith('/_next/image')) {
    event.respondWith(loadProfile().then((profile) => staleWhileRevalidate(request, ASSETS_CACHE, PROFILES[profile]?.maxAssets || 80)));
    return;
  }

  if (url.pathname === '/manifest.webmanifest' || url.pathname.startsWith('/icons/')) {
    event.respondWith(networkFirst(request, CACHE_NAME).catch(async () => {
      const cached = await caches.match(request);
      return cached || new Response('No disponible', { status: 503 });
    }));
  }
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;
  if (data.type === 'SKIP_WAITING') { self.skipWaiting(); return; }
  if (data.type === 'SET_DEVICE_PROFILE') { event.waitUntil(saveProfile(data.profile)); return; }
  if (data.type === 'CACHE_OFFLINE_ROUTES') { event.waitUntil(syncOfflineRoutes()); return; }
  if (data.type === 'UPDATE_CACHE') {
    event.waitUntil((async () => {
      const broadcast = async (msg) => {
        const clients = await self.clients.matchAll();
        clients.forEach((c) => c.postMessage(msg));
      };
      try {
        await broadcast({ type: 'SW_LOG', message: 'Iniciando actualización de caché...' });

        const staticCache = await caches.open(STATIC_CACHE);
        await broadcast({ type: 'SW_LOG', message: 'Descargando recursos del portal...' });
        await precacheShellAssets(staticCache);

        await broadcast({ type: 'SW_LOG', message: 'Guardando Mis QR y Eventos...' });
        await syncOfflineRoutes();

        const assetsCache = await caches.open(ASSETS_CACHE);
        await Promise.allSettled(PRECACHE_ICONS.map(async (url) => {
          const response = await fetch(url, { cache: 'no-store' });
          if (isCacheable(response)) await assetsCache.put(url, response);
        }));

        await broadcast({ type: 'SW_LOG', message: 'Proceso completado con éxito.' });
        await broadcast({ type: 'CACHE_UPDATED' });
      } catch (error) {
        console.error('Error actualizando la caché manualmente:', error);
        await broadcast({ type: 'SW_LOG', message: '❌ Error en la actualización.' });
      }
    })());
    return;
  }
  const handler = EXT.messages[data.type];
  if (typeof handler === 'function') handler(event);
});