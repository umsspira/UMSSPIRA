
const VERSION = 'v1.0.0';

const CACHE_NAME = `umsspira-core-portal-${VERSION}`;
const STATIC_CACHE = `umsspira-static-${VERSION}`;
const ASSETS_CACHE = `umsspira-assets-${VERSION}`;
const CONFIG_CACHE = `umsspira-config-${VERSION}`;
const ROUTES_CACHE = `umsspira-routes-${VERSION}`;

const ALL_CACHES = [CACHE_NAME, STATIC_CACHE, ASSETS_CACHE, CONFIG_CACHE, ROUTES_CACHE];
const CORE_ASSETS = ['/portal'];
const PRECACHE_URLS = ['/offline', '/manifest.webmanifest', '/favicon.ico'];
const PRECACHE_ICONS = ['/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png', '/icons/favicon-32.png'];

const PROFILES = { default: { maxAssets: 80 }, desktop: { maxAssets: 200 }, mobile: { maxAssets: 40 } };
const DEFAULT_PROFILE = 'default';
const PROFILE_KEY = '/__sw-profile';
const IS_LOCALHOST = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

const EXT = (self.UMSSPIRA_SW = { routes: [], messages: {} });
try { if (typeof importScripts === 'function') importScripts('/sw-extensions.js'); } catch (e) { console.warn(e); }

const PRIVATE_ROUTE_PREFIXES = ['/portal/mensajes', '/portal/perfil', '/portal/configuracion', '/portal/admin', '/portal/notificaciones', '/portal/administracion', '/api', '/auth'];
function isPrivateRoute(pathname) { return PRIVATE_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)); }

const OFFLINE_ALLOWED_ROUTES = ['/portal', '/portal/eventos', '/portal/empleos', '/portal/beneficios', '/portal/comunidad'];
function isSafeOfflineRoute(request) {
  if (request.method !== 'GET' || request.mode !== 'navigate') return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isPrivateRoute(url.pathname) || request.headers.get('Authorization') || url.search) return false;
  return OFFLINE_ALLOWED_ROUTES.includes(url.pathname.replace(/\/$/, '') || '/');
}

function isCacheable(response) { return response && response.ok && (response.type === 'basic' || response.type === 'default'); }
function canStoreNavigationResponse(response) {
  if (!isCacheable(response) || response.redirected) return false;
  if (!(response.headers.get('content-type') || '').includes('text/html')) return false;
  if (/no-store|private/i.test(response.headers.get('cache-control') || '')) return false;
  if (response.headers.has('set-cookie')) return false;
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

// --- INSTALL: aquí aseguramos que /offline se guarde SÍ o SÍ ---
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const staticCache = await caches.open(STATIC_CACHE);
    
    // 1. Precachear /offline (CRÍTICO para que el modo avión muestre la página)
    try {
      await staticCache.add('/offline');
      console.log('[SW] /offline precacheado correctamente');
    } catch (e) {
      console.error('[SW] No se pudo precachear /offline', e);
    }

    // 2. Precachear el resto de URLs
    await Promise.allSettled(PRECACHE_URLS.map(async (url) => {
      try {
        const response = await fetch(url);
        if (isCacheable(response)) await staticCache.put(url, response);
      } catch (e) {}
    }));

    // 3. Precachear iconos
    const assetsCache = await caches.open(ASSETS_CACHE);
    await Promise.allSettled(PRECACHE_ICONS.map(async (url) => {
      try {
        const response = await fetch(url);
        if (isCacheable(response)) await assetsCache.put(url, response);
      } catch (e) {}
    }));

    // 4. Precachear assets del shell (/portal)
    await precacheShellAssets(staticCache);

    // 5. Precachear /portal en la caché principal
    const coreCache = await caches.open(CACHE_NAME);
    await Promise.allSettled(CORE_ASSETS.map(async (url) => {
      try {
        const request = new Request(url, { credentials: 'omit', cache: 'no-store' });
        const response = await fetch(request);
        const pathname = new URL(url, self.location.origin).pathname;
        if (OFFLINE_ALLOWED_ROUTES.includes(pathname) && !isPrivateRoute(pathname) && canStoreNavigationResponse(response)) {
          await coreCache.put(url, response.clone());
        }
      } catch (e) {}
    }));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith('umsspira-') && !ALL_CACHES.includes(name)).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
}

function getHandledUrl(request) {
  if (request.method !== 'GET') return null;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return null;
  if (['/api/', '/auth/'].some(p => url.pathname.startsWith(p)) || url.pathname.includes('webpack-hmr') || url.pathname === '/sw.js' || url.pathname === '/sw-extensions.js') return null;
  if (request.mode === 'navigate' && url.pathname !== '/portal' && !url.pathname.startsWith('/portal/') && url.pathname !== '/offline') return null;
  if (request.headers.get('Authorization')) return null;
  if (url.pathname !== '/portal' && !url.pathname.startsWith('/portal/') && !url.pathname.startsWith('/_next/static/') && !url.pathname.startsWith('/_next/image') && !url.pathname.startsWith('/icons/') && url.pathname !== '/manifest.webmanifest' && url.pathname !== '/offline') return null;
  return url;
}

// --- NAVIGATION HANDLER: la lógica clave para el modo offline ---
async function handleNavigation(request) {
  const canCache = isSafeOfflineRoute(request);

  try {
    // 1. Intenta red primero
    const response = await fetch(request);
    if (canCache && canStoreNavigationResponse(response)) {
      const cache = await caches.open(ROUTES_CACHE);
      await cache.put(request, response.clone());
      await trimCache(ROUTES_CACHE, 20);
    }
    return response;
  } catch (e) {
    // 2. Falló la red. Buscar en caché de rutas visitadas
    if (canCache) {
      const cache = await caches.open(ROUTES_CACHE);
      const cachedPage = await cache.match(request);
      if (cachedPage) return cachedPage;
      if (new URL(request.url).pathname === '/portal') {
        const coreCache = await caches.open(CACHE_NAME);
        const corePage = await coreCache.match('/portal');
        if (corePage) return corePage;
      }
    }

    // 3. Si no está en caché, SIEMPRE mostrar /offline
    const offlinePage = await caches.match('/offline');
    if (offlinePage) return offlinePage;

    // 4. Fallback final (poco probable que ocurra si el install funcionó)
    return new Response('Sin conexión. Reintenta más tarde.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
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
  for (const route of EXT.routes) {
    try { if (route.match(new URL(request.url), request)) { event.respondWith(route.handle(event)); return; } } catch (e) {}
  }
  const url = getHandledUrl(request);
  if (!url) return;
  if (request.mode === 'navigate') { event.respondWith(handleNavigation(request)); return; }
  if (isPrivateRoute(url.pathname) || request.headers.has('RSC') || request.headers.has('Next-Router-State-Tree') || url.searchParams.has('_rsc')) return;
  if (url.pathname.startsWith('/_next/static/')) { event.respondWith(IS_LOCALHOST ? networkFirst(request, STATIC_CACHE) : cacheFirst(request, STATIC_CACHE)); return; }
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

// --- MESSAGE: aquí está la actualización REAL de caché ---
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;
  if (data.type === 'SKIP_WAITING') { self.skipWaiting(); return; }
  if (data.type === 'SET_DEVICE_PROFILE') { event.waitUntil(saveProfile(data.profile)); return; }
  if (data.type === 'UPDATE_CACHE') {
    event.waitUntil((async () => {
      try {
        const sendLog = async (msg) => {
          const clients = await self.clients.matchAll();
          clients.forEach((c) => c.postMessage({ type: 'SW_LOG', message: msg }));
        };
        await sendLog('Iniciando actualización de caché...');
        
        await sendLog('Descargando página offline...');
        const staticCache = await caches.open(STATIC_CACHE);
        await staticCache.add('/offline').catch(() => {});

        await sendLog('Descargando recursos del portal...');
        await precacheShellAssets(staticCache);
        
        await sendLog('Descargando iconos...');
        const assetsCache = await caches.open(ASSETS_CACHE);
        await Promise.allSettled(PRECACHE_ICONS.map(async (url) => {
          const response = await fetch(url, { cache: 'no-store' });
          if (isCacheable(response)) await assetsCache.put(url, response);
        }));

        await sendLog('Proceso completado con éxito.');
        const clients = await self.clients.matchAll();
        clients.forEach((client) => client.postMessage({ type: 'CACHE_UPDATED' }));
      } catch (error) {
        console.error('Error actualizando la caché manualmente:', error);
        const clients = await self.clients.matchAll();
        clients.forEach((client) => client.postMessage({ type: 'SW_LOG', message: '❌ Error en la actualización.' }));
      }
    })());
    return;
  }
  const handler = EXT.messages[data.type];
  if (typeof handler === 'function') handler(event);
});