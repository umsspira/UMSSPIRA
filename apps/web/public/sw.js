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