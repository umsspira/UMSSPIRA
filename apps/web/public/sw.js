const VERSION = 'v2.0.0';

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

function isCacheable(response) { return response && response.ok && (response.type === 'basic' || response.type === 'default'); }
function canStoreNavigationResponse(response) {
  if (!isCacheable(response) || response.redirected) return false;
  if (!(response.headers.get('content-type') || '').includes('text/html')) return false;
  if (/no-store|private/i.test(response.headers.get('cache-control') || '')) return false;
  if (response.headers.has('set-cookie')) return false;
  return true;
}

// Extrae y guarda los CSS/JS incrustados en el HTML
async function cacheAssetsFromHtml(html, cache) {
  const urls = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) || [])];
  await Promise.allSettled(urls.map(async (url) => {
    try {
      const res = await fetch(url);
      if (isCacheable(res)) await cache.put(url, res);
    } catch (e) {}
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const staticCache = await caches.open(STATIC_CACHE);
    
    // 1. Precachear la página offline con todos sus estilos
    try {
      const offlineRes = await fetch('/offline');
      if (offlineRes.ok) {
        await staticCache.put('/offline', offlineRes.clone());
        const html = await offlineRes.text();
        await cacheAssetsFromHtml(html, staticCache);
      }
    } catch (e) { console.error('[SW] Error /offline', e); }

    // 2. Precachear el portal
    try {
      const portalReq = new Request('/portal', { cache: 'no-store' });
      const portalRes = await fetch(portalReq);
      if (canStoreNavigationResponse(portalRes)) {
        const coreCache = await caches.open(CACHE_NAME);
        await coreCache.put('/portal', portalRes.clone());
        const html = await portalRes.text();
        await cacheAssetsFromHtml(html, staticCache);
      }
    } catch (e) {}

    // 3. Iconos y recursos
    await Promise.allSettled(PRECACHE_ICONS.map(async (url) => {
      try {
        const response = await fetch(url);
        if (isCacheable(response)) {
          const assetsCache = await caches.open(ASSETS_CACHE);
          await assetsCache.put(url, response);
        }
      } catch (e) {}
    }));

    self.skipWaiting(); // Forzar activación inmediata
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
  if (request.headers.get('Authorization')) return null;
  return url;
}

// Lógica central de navegación
async function handleNavigation(request) {
  const url = new URL(request.url);
  
  try {
    // 1. Intentar red primero (si hay internet)
    const response = await fetch(request);
    if (canStoreNavigationResponse(response)) {
      const cache = await caches.open(ROUTES_CACHE);
      await cache.put(request, response.clone());
      await trimCache(ROUTES_CACHE, 20);
    }
    return response;
  } catch (e) {
    // 2. 🚨 MODO AVIÓN (Falló la red)
    
    // Si el usuario está intentando ir al inicio, le mostramos el portal si lo tiene guardado
    if (url.pathname === '/portal' || url.pathname === '/') {
      const coreCache = await caches.open(CACHE_NAME);
      const corePage = await coreCache.match('/portal');
      if (corePage) return corePage;
    }

    // 3. Si es cualquier otra ruta (o si el portal falló), devolvemos SIEMPRE /offline.
    // Esto evita que Next.js muestre el dinosaurio o una pantalla en blanco.
    const staticCache = await caches.open(STATIC_CACHE);
    const offlinePage = await staticCache.match('/offline');
    if (offlinePage) return offlinePage;

    // 4. Fallback de emergencia
    return new Response('Sin conexión. Reintenta más tarde.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
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
  
  // Manejo especial para navegación (recargas o cambio de página)
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  // Extensiones personalizadas
  for (const route of EXT.routes) {
    try { if (route.match(new URL(request.url), request)) { event.respondWith(route.handle(event)); return; } } catch (e) {}
  }
  
  const url = getHandledUrl(request);
  if (!url) return;

  if (isPrivateRoute(url.pathname) || request.headers.has('RSC') || request.headers.has('Next-Router-State-Tree') || url.searchParams.has('_rsc')) return;
  
  // Archivos estáticos
  if (url.pathname.startsWith('/_next/static/')) { 
    event.respondWith(cacheFirst(request, STATIC_CACHE)); 
    return; 
  }
  
  // Imágenes
  if (request.destination === 'image' || request.destination === 'font' || url.pathname.startsWith('/_next/image')) {
    event.respondWith(staleWhileRevalidate(request, ASSETS_CACHE, 80));
    return;
  }
  
  // Manifest e íconos
  if (url.pathname === '/manifest.webmanifest' || url.pathname.startsWith('/icons/')) {
    event.respondWith(networkFirst(request, CACHE_NAME).catch(async () => {
      const cached = await caches.match(request);
      return cached || new Response('No disponible', { status: 503 });
    }));
  }
});

// Mensajes (Actualizar Caché)
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;
  if (data.type === 'SKIP_WAITING') { self.skipWaiting(); return; }
  if (data.type === 'UPDATE_CACHE') {
    event.waitUntil((async () => {
      try {
        const sendLog = async (msg) => {
          const clients = await self.clients.matchAll();
          clients.forEach((c) => c.postMessage({ type: 'SW_LOG', message: msg }));
        };
        await sendLog('Iniciando actualización de caché...');
        
        const staticCache = await caches.open(STATIC_CACHE);
        const offlineRes = await fetch('/offline');
        if (offlineRes.ok) {
          await staticCache.put('/offline', offlineRes.clone());
          const html = await offlineRes.text();
          await cacheAssetsFromHtml(html, staticCache);
        }

        const clients = await self.clients.matchAll();
        clients.forEach((client) => client.postMessage({ type: 'CACHE_UPDATED' }));
      } catch (error) {
        console.error('Error actualizando la caché manualmente:', error);
      }
    })());
    return;
  }
});