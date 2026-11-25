const VERSION = 'v1.0.6';

const CACHE_NAME = `umsspira-core-portal-${VERSION}`;
const STATIC_CACHE = `umsspira-static-${VERSION}`;
const ASSETS_CACHE = `umsspira-assets-${VERSION}`;
const CONFIG_CACHE = `umsspira-config-${VERSION}`;
const ROUTES_CACHE = `umsspira-routes-${VERSION}`;

const ALL_CACHES = [CACHE_NAME, STATIC_CACHE, ASSETS_CACHE, CONFIG_CACHE, ROUTES_CACHE];
const PRECACHE_URLS = ['/manifest.webmanifest', '/favicon.ico'];
const PRECACHE_ICONS = ['/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png', '/icons/favicon-32.png', '/assets/events/umsspira-logo-desktop.png'];

const PROFILES = { default: { maxAssets: 80 }, desktop: { maxAssets: 200 }, mobile: { maxAssets: 40 } };
const DEFAULT_PROFILE = 'default';
const PROFILE_KEY = '/__sw-profile';
const IS_LOCALHOST = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

const EXT = (self.UMSSPIRA_SW = { routes: [], messages: {} });
try { if (typeof importScripts === 'function') importScripts('/sw-extensions.js'); } catch (e) { console.warn(e); }

const PRIVATE_ROUTE_PREFIXES = ['/portal/mensajes', '/portal/perfil', '/portal/configuracion', '/portal/admin', '/portal/notificaciones', '/portal/administracion', '/api', '/auth'];
function isPrivateRoute(pathname) { return PRIVATE_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)); }

// Páginas que se guardan para verse sin conexión (Mis QR, Eventos, Configuración y la pantalla de validación de HU08)
const OFFLINE_ROUTE_PREFIXES = ['/events/catalog/passes', '/mis-pases', '/portal/eventos', '/portal/configuracion', '/portal/validacion-offline'];
const OFFLINE_ROOT_ROUTES = ['/events/catalog/passes', '/mis-pases', '/portal/eventos', '/portal/configuracion', '/portal/validacion-offline'];
// Secciones principales: se guardan SOLO cuando la persona las abre con conexión (no se descargan por adelantado).
// Sin conexión se abre lo que ya se visitó; lo que no se visitó muestra el aviso «Sin conexión».
const VISITED_ROUTE_PREFIXES = ['/portal/beneficios', '/portal/empleos', '/job-postings', '/mentorship', '/my-applications'];
function isVisitedRoute(pathname) {
  return pathname === '/portal' || VISITED_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
function isOfflineRoute(pathname) {
  if (OFFLINE_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  if (isVisitedRoute(pathname)) return true;
  return /\/(passes|pases)(\/|$)/.test(pathname);
}

// ---------------------------------------------------------------------------
// Verificación de respuestas (reforzada: evita cachear respuestas inútiles)
// ---------------------------------------------------------------------------
function isCacheable(response) {
  if (!response) return false;
  if (!response.ok) return false;
  if (response.status === 206) return false;                 // Partial Content no sirve como copia íntegra
  if (response.type !== 'basic' && response.type !== 'default') return false;
  if (response.body === null) return false;
  const len = response.headers.get('content-length');
  if (len !== null && Number(len) === 0) return false;
  return true;
}

// Clave estable: siempre el pathname, sin query ni headers, normalizando trailing slash
function routeKey(pathname) {
  let p = pathname || '/';
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return new Request(new URL(p, self.location.origin).href);
}

// Una respuesta con redirected=true no se puede servir a una navegación: se crea una limpia.
// Preserva headers relevantes para no romper CSP ni encoding.
async function cleanResponse(response) {
  if (!response.redirected) return response;
  const body = await response.blob();
  const headers = {};
  const keep = ['content-type', 'cache-control', 'content-language', 'x-content-type-options'];
  for (const h of keep) {
    const v = response.headers.get(h);
    if (v) headers[h] = v;
  }
  if (!headers['content-type']) headers['content-type'] = 'text/html; charset=utf-8';
  return new Response(body, { status: 200, statusText: 'OK', headers });
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

// ---------------------------------------------------------------------------
// Utilidades de caché con DOBLE VERIFICACIÓN
// ---------------------------------------------------------------------------

// Relee la caché y confirma que la entrada existe y no está vacía.
async function verifyCached(cacheName, key, { allowEmpty = false } = {}) {
  try {
    const cache = await caches.open(cacheName);
    const hit = await cache.match(key, { ignoreSearch: true, ignoreVary: true });
    if (!hit) return false;
    if (allowEmpty) return true;
    const len = hit.headers.get('content-length');
    if (len !== null && Number(len) === 0) return false;
    return true;
  } catch (e) {
    return false;
  }
}

// put defensivo: clona, guarda, verifica y reintenta una vez recortando si hay cuota llena.
async function safePut(cacheName, key, response, { maxEntries = 0, allowEmpty = false } = {}) {
  if (!isCacheable(response)) return false;
  let clone;
  try { clone = response.clone(); } catch (e) { return false; }

  try {
    const cache = await caches.open(cacheName);
    await cache.put(key, clone);
  } catch (err) {
    // Cuota llena: recortar y reintentar una sola vez.
    try {
      if (maxEntries > 0) await trimCache(cacheName, Math.max(1, Math.floor(maxEntries / 2)));
      const retryClone = response.clone();
      const cache = await caches.open(cacheName);
      await cache.put(key, retryClone);
    } catch (e2) {
      console.warn('[SW] safePut falló definitivamente:', cacheName, String(key.url || key), e2);
      return false;
    }
  }

  const ok = await verifyCached(cacheName, key, { allowEmpty });
  if (!ok) console.warn('[SW] Verificación post-put falló:', cacheName, String(key.url || key));
  return ok;
}

// Recorta por antigüedad de inserción y verifica post-recorte.
async function trimCache(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length <= maxEntries) return true;
    const toDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
    const remaining = await cache.keys();
    if (remaining.length > maxEntries) {
      // Segundo pase defensivo
      const extra = remaining.slice(0, remaining.length - maxEntries);
      await Promise.all(extra.map((key) => cache.delete(key)));
    }
    return true;
  } catch (e) {
    return false;
  }
}

// Archivos de /_next/static que usa una página (estilos, scripts, fuentes).
function extractStaticUrls(text) {
  const found = new Set();
  const add = (raw) => {
    let url = raw;
    while (url.endsWith(')') && (url.match(/\)/g) || []).length > (url.match(/\(/g) || []).length) url = url.slice(0, -1);
    found.add(url);
  };
  for (const match of text.match(/\/_next\/static\/[^"'\s\\<>{};]+/g) || []) add(match);
  for (const match of text.matchAll(/["'](static\/(?:chunks|css|media)\/[^"'\s\\<>{};]+)/g)) add('/_next/' + match[1]);
  return [...found];
}

// Descarga la página completa de una ruta y la guarda junto con sus scripts/estilos.
// Doble verificación: HTML + al menos 1 asset crítico (si existen) + reintento único.
async function storeRouteHtml(pathname, { attempt = 0 } = {}) {
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

    const htmlOk = await safePut(ROUTES_CACHE, routeKey(pathname), clean, { maxEntries: 20 });
    if (!htmlOk) {
      if (attempt < 1) return storeRouteHtml(pathname, { attempt: attempt + 1 });
      return false;
    }

    const urls = extractStaticUrls(html);
    let assetsOk = 0;
    await Promise.allSettled(urls.map(async (u) => {
      try {
        const cache = await caches.open(STATIC_CACHE);
        if (await cache.match(u, { ignoreSearch: true })) { assetsOk++; return; }
        const res = await fetch(u);
        if (await safePut(STATIC_CACHE, u, res)) assetsOk++;
      } catch (e) {}
    }));

    // Verificación final: si había assets declarados, al menos uno debe estar guardado.
    if (urls.length > 0 && assetsOk === 0) {
      if (attempt < 1) return storeRouteHtml(pathname, { attempt: attempt + 1 });
      console.warn('[SW] HTML guardado pero sin assets verificables:', pathname);
      return false;
    }

    // Confirmación explícita del HTML tras el trabajo asíncrono.
    const finalOk = await verifyCached(ROUTES_CACHE, routeKey(pathname));
    if (!finalOk && attempt < 1) return storeRouteHtml(pathname, { attempt: attempt + 1 });
    return finalOk;
  } catch (e) {
    console.warn('[SW] Error guardando', pathname, e);
    if (attempt < 1) return storeRouteHtml(pathname, { attempt: attempt + 1 });
    return false;
  }
}

// Deduplicación de syncOfflineRoutes (evita carreras entre install, activate y mensajes)
const inFlightRoutes = new Map();
async function syncOfflineRoutes() {
  const results = await Promise.allSettled(OFFLINE_ROOT_ROUTES.map((r) => {
    if (inFlightRoutes.has(r)) return inFlightRoutes.get(r);
    const p = storeRouteHtml(r).finally(() => inFlightRoutes.delete(r));
    inFlightRoutes.set(r, p);
    return p;
  }));
  return results;
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
    if (!response.ok) return false;
    const html = await response.text();
    const urls = extractStaticUrls(html);
    let ok = 0;
    await Promise.allSettled(urls.map(async (url) => {
      try {
        const res = await fetch(url);
        if (await safePut(STATIC_CACHE, url, res)) ok++;
      } catch (e) {}
    }));
    // Verificación: si había assets, al menos uno debe haber quedado.
    if (urls.length > 0 && ok === 0) {
      console.warn('[SW] precacheShellAssets: ningún asset verificable');
      return false;
    }
    return true;
  } catch (e) { return false; }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const staticCache = await caches.open(STATIC_CACHE);

    await Promise.allSettled(PRECACHE_URLS.map(async (url) => {
      try {
        const response = await fetch(url);
        if (isCacheable(response)) await safePut(STATIC_CACHE, url, response);
      } catch (e) {}
    }));

    const assetsCache = await caches.open(ASSETS_CACHE);
    await Promise.allSettled(PRECACHE_ICONS.map(async (url) => {
      try {
        const response = await fetch(url);
        if (isCacheable(response)) await safePut(ASSETS_CACHE, url, response);
      } catch (e) {}
    }));

    await precacheShellAssets(staticCache);
    await syncOfflineRoutes();
    // HU06: no se activa sola. La versión nueva queda en espera hasta que la persona pulse «Actualizar»
    // (mensaje SKIP_WAITING). La primera instalación se activa igualmente porque no hay versión anterior.
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

// --- PÁGINA SIN CONEXIÓN (HU14) ---
const OFFLINE_NAV_MEMBER = [
  { label: 'Inicio', href: '/portal', prefixes: [] },
  { label: 'Directorio', href: '/profile', prefixes: ['/profile', '/afinidad'] },
  { label: 'Bolsa de trabajo', href: '/job-postings', prefixes: ['/portal/empleos', '/job-postings'] },
  { label: 'Mentorías', href: '/mentorship', prefixes: ['/portal/mentorias', '/mentorship'] },
  { label: 'Eventos', href: '/portal/eventos', prefixes: ['/portal/eventos', '/events'] },
];
const OFFLINE_NAV_GUEST = [
  { label: 'Inicio', href: '/portal/institucional', prefixes: [] },
  { label: 'Bolsa de trabajo', href: '/portal/institucional?tab=empleos', prefixes: [] },
  { label: 'Mentorías', href: '/portal/institucional?tab=mentorias', prefixes: [] },
  { label: 'Eventos', href: '/portal/institucional?tab=eventos', prefixes: [] },
];
const OFFLINE_PUBLIC_PREFIXES = ['/portal/institucional'];

function offlineHtml() {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sin conexión · UMSSPIRA</title>
<style>
  *{box-sizing:border-box}
  html,body{margin:0}
  body{min-height:100vh;background:#EEE9DF;color:#1B2632;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;overflow-x:hidden}
  a,button{font-family:inherit}
  [hidden]{display:none!important}
  a:focus-visible,button:focus-visible{outline:2px solid #FFB162;outline-offset:3px}
  .bar{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:24px;height:64px;padding:0 24px;background:#1B2632;color:#EEE9DF;border-bottom:1px solid #2C3B4D}
  .logo{display:flex;align-items:center;flex:0 0 auto;min-height:44px;color:#EEE9DF;text-decoration:none;font-weight:800;font-size:1.15rem;letter-spacing:.2px}
  .logo img{display:block;height:40px;width:auto;max-width:150px;object-fit:contain}
  .logo b{color:#FFB162}
  nav.menu{display:flex;align-items:stretch;align-self:stretch;gap:26px;margin-left:8px}
  nav.menu a{position:relative;display:inline-flex;align-items:center;min-height:44px;color:#EEE9DF;text-decoration:none;font-size:.875rem;white-space:nowrap}
  nav.menu a:hover{color:#FFB162}
  nav.menu a.on{color:#FFB162;font-weight:650}
  nav.menu a.on:after{content:"";position:absolute;left:0;right:0;bottom:8px;height:3px;border-radius:2px;background:#FFB162}
  .acct{display:flex;align-items:center;gap:12px;margin-left:auto;min-width:0}
  .avatar{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;width:40px;height:40px;border:1px solid #FFB162;border-radius:50%;background:#2C3B4D;color:#EEE9DF;font-size:.75rem;font-weight:700}
  .who{max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.8rem}
  .go{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 16px;border-radius:10px;background:#FFB162;color:#1B2632;text-decoration:none;font-size:.8rem;font-weight:650;white-space:nowrap}
  .burger{display:none;align-items:center;justify-content:center;width:44px;height:44px;border:0;background:transparent;color:#EEE9DF;font-size:1.5rem;cursor:pointer}
  .wrap{width:100%;max-width:49rem;margin:0 auto;padding:44px 20px 40px}
  .card{background:#fff;border-radius:1.25rem;padding:2.25rem 1.75rem 1.75rem;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.06)}
  .icon{width:62px;height:62px;margin:0 auto 14px;border-radius:50%;background:#FFF1DC;display:flex;align-items:center;justify-content:center;font-size:1.9rem}
  h1{margin:0 0 10px;font-size:1.65rem;line-height:1.25;color:#1B2632}
  .msg{margin:0 auto 22px;max-width:30rem;font-size:.95rem;line-height:1.55;color:#5E6974}
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;border:0;border-radius:999px;background:#FFB162;color:#1B2632;font-weight:700;font-size:.95rem;padding:0 26px;cursor:pointer;text-decoration:none}
  .btn:hover{background:#FFA044}
  .btn[disabled]{opacity:.7;cursor:wait}
  .notice{margin:14px auto 0;max-width:30rem;padding:10px 14px;border-radius:10px;background:#FFF1DC;color:#7A4A12;font-size:.85rem;font-weight:600}
  .notice[hidden]{display:none}
  .avail{margin-top:26px;padding:16px;border-radius:12px;background:#EDF2FA;text-align:left}
  .avail h2{margin:0 0 12px;font-size:.85rem;color:#1B2632}
  /* HU09 CA-02: acceso destacado a Mis códigos QR, visible sin recorrer el menú. */
  .qr-hero{display:flex;align-items:center;gap:12px;min-height:56px;margin-bottom:12px;padding:12px 16px;border-radius:12px;background:#1B2632;color:#EEE9DF;text-decoration:none}
  .qr-hero:hover{background:#2C3B4D}
  .qr-hero-icon{display:flex;align-items:center;justify-content:center;flex:0 0 auto;width:40px;height:40px;border-radius:10px;background:#FFB162;color:#1B2632;font-size:1.2rem}
  .qr-hero-text{display:flex;flex-direction:column;gap:2px;min-width:0;text-align:left}
  .qr-hero-text strong{font-size:.95rem}
  .qr-hero-text span{font-size:.78rem;opacity:.85}
  .qr-hero-go{margin-left:auto;font-size:1.2rem;color:#FFB162}
  .tiles{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
  .tile{display:flex;align-items:center;gap:8px;min-height:44px;padding:10px 14px;border-radius:8px;background:#fff;color:#1B2632;text-decoration:none;font-size:.85rem}
  .tile:hover{background:#FFF1DC}
  .logout{width:100%;margin-top:12px;border:0;cursor:pointer;text-align:left}
  .logout[disabled]{opacity:.7;cursor:wait}
  nav.menu button.out{display:none;align-items:center;min-height:48px;padding:0 4px;border:0;border-bottom:1px solid #2C3B4D;background:transparent;color:#EEE9DF;font-size:.875rem;text-align:left;cursor:pointer}
  .evlist{margin-top:22px;padding:16px;border-radius:12px;background:#FFF8EE;text-align:left}
  .evlist h2{margin:0 0 6px;font-size:.95rem;color:#1B2632}
  .evlist .evnote{margin:0 0 12px;font-size:.78rem;color:#5E6974}
  .evlist ul{margin:0;padding:0;list-style:none;display:grid;gap:10px}
  .evlist li{padding:12px 14px;border-radius:10px;background:#fff;border:1px solid #E6DFD0}
  .evlist li strong{display:block;font-size:.92rem;color:#1B2632}
  .evlist li span{display:block;margin-top:2px;font-size:.8rem;color:#5E6974}
  .foot{margin-top:22px;text-align:center;font-size:.75rem;color:rgba(44,56,77,.5)}
  @media (max-width:900px){
    .bar{gap:8px;padding:0 14px}
    .burger{display:inline-flex;margin-left:auto}
    .acct{margin-left:0}
    .who{display:none}
    nav.menu{display:none;position:absolute;top:64px;left:0;right:0;flex-direction:column;align-self:auto;gap:0;margin:0;padding:6px 14px 14px;background:#1B2632;border-top:1px solid #2C3B4D}
    nav.menu.open{display:flex}
    nav.menu a{min-height:48px;padding:0 4px;border-bottom:1px solid #2C3B4D}
    nav.menu a.on:after{display:none}
    nav.menu a.on{box-shadow:inset 3px 0 0 #FFB162;padding-left:12px}
    nav.menu button.out{display:flex}
    .tiles{grid-template-columns:1fr}
    .wrap{padding:24px 14px 32px}
  }
  @media (max-width:420px){ .logo img{max-width:112px} .go{padding:0 10px} }
</style>
</head>
<body>
<header class="bar">
  <a class="logo" id="logo" href="/portal" aria-label="UMSSPIRA: ir al inicio">
    <img src="/assets/events/umsspira-logo-desktop.png" alt="" id="logo-img">
    <span id="logo-text" hidden>UMSS<b>PIRA</b></span>
  </a>
  <nav class="menu" id="menu" aria-label="Navegación principal"></nav>
  <div class="acct" id="acct"></div>
  <button type="button" class="burger" id="burger" aria-label="Abrir navegación principal" aria-expanded="false" aria-controls="menu">&#9776;</button>
</header>
<main class="wrap">
  <section class="card">
    <div class="icon" aria-hidden="true">&#128225;</div>
    <h1 data-testid="offline-title" id="title">Sin conexión a Internet</h1>
    <p class="msg" id="msg">Esta pantalla todavía no se guardó en tu dispositivo. Cuando vuelvas a tener red podrás abrirla.</p>
    <a class="btn" id="login" href="/login" hidden>Iniciar sesión</a>
    <button type="button" class="btn" id="retry" data-testid="offline-retry">&#10227; Reintentar</button>
    <p class="notice" id="notice" role="status" aria-live="polite" hidden>Todavía no hay conexión</p>
    <p class="notice" id="logged-out" role="status" aria-live="polite" hidden>Sesión cerrada. Tus datos privados se borraron de este dispositivo.</p>
    <div class="evlist" id="events-box" data-testid="offline-events-box" hidden>
      <h2>Eventos guardados en este dispositivo</h2>
      <p class="evnote" id="events-note"></p>
      <ul id="events-ul"></ul>
    </div>
    <div class="avail">
      <h2>Disponible sin conexión</h2>
      <!-- HU09 CA-02: acceso destacado a Mis códigos QR sin recorrer el menú. -->
      <a class="qr-hero" href="/mis-pases" data-testid="offline-link-passes">
        <span class="qr-hero-icon" aria-hidden="true">&#9638;</span>
        <span class="qr-hero-text"><strong>Mis códigos QR</strong><span>Abre tus pases guardados en este dispositivo.</span></span>
        <span class="qr-hero-go" aria-hidden="true">&#8250;</span>
      </a>
      <div class="tiles">
        <a class="tile" href="/portal/eventos" data-testid="offline-link-events">&#128197; Eventos visitados</a>
        <a class="tile" href="/portal/configuracion" data-testid="offline-link-settings">&#9881; Configuración</a>
      </div>
      <button type="button" class="tile logout" id="logout" data-testid="offline-logout" hidden>Cerrar sesión</button>
    </div>
  </section>
  <p class="foot">UMSSPIRA · Tu comunidad, siempre conectada</p>
</main>
<script>
(function () {
  var NAV_MEMBER = ${JSON.stringify(OFFLINE_NAV_MEMBER)};
  var NAV_GUEST = ${JSON.stringify(OFFLINE_NAV_GUEST)};
  var PUBLIC = ${JSON.stringify(OFFLINE_PUBLIC_PREFIXES)};
  var MAX_AGE = 7 * 24 * 60 * 60 * 1000;
  var path = location.pathname;

  function read(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
  function sessionOk() {
    try { if (localStorage.getItem('umsspira.offline.pending-logout') === '1') return false; } catch (e) { return false; }
    var v = read('umsspira.offline.session-validation');
    if (!v || typeof v.validatedAt !== 'number') return false;
    var age = Date.now() - v.validatedAt;
    return age >= 0 && age < MAX_AGE;
  }
  function startsWith(p, prefixes) {
    for (var i = 0; i < prefixes.length; i++) { if (p === prefixes[i] || p.indexOf(prefixes[i] + '/') === 0) return true; }
    return false;
  }

  var hasSession = sessionOk();
  var nav = hasSession ? NAV_MEMBER : NAV_GUEST;
  var current = 0;
  for (var i = 1; i < nav.length; i++) { if (startsWith(path, nav[i].prefixes)) { current = i; break; } }

  var menu = document.getElementById('menu');
  nav.forEach(function (item, index) {
    var a = document.createElement('a');
    a.href = item.href;
    a.textContent = item.label;
    if (index === current) { a.className = 'on'; a.setAttribute('aria-current', 'page'); }
    if (index === 0) a.setAttribute('data-testid', 'offline-link-home');
    menu.appendChild(a);
  });
  document.getElementById('logo').href = nav[0].href;

  var acct = document.getElementById('acct');
  var user = hasSession ? read('umsspira.offline.nav-user') : null;
  if (user && typeof user.name === 'string') {
    var av = document.createElement('span'); av.className = 'avatar'; av.textContent = String(user.initials || user.name.slice(0, 2)).toUpperCase().slice(0, 2);
    var who = document.createElement('span'); who.className = 'who'; who.textContent = user.name;
    acct.appendChild(av); acct.appendChild(who);
  } else if (!hasSession) {
    var go = document.createElement('a'); go.className = 'go'; go.href = '/login'; go.textContent = 'Iniciar sesión';
    acct.appendChild(go);
  }

  // Los QR, eventos guardados y configuración son solo del titulado: empresa y administrador solo ven el aviso de conexión.
  var notTitulado = hasSession && user && user.role && user.role !== 'titulado';
  if (notTitulado) {
    var availBox = document.querySelector('.avail');
    if (availBox) {
      ['.qr-hero', '[data-testid="offline-link-events"]', '[data-testid="offline-link-settings"]'].forEach(function (sel) {
        var el = availBox.querySelector(sel); if (el) el.hidden = true;
      });
      var h = availBox.querySelector('h2'); if (h) h.hidden = true;
    }
  }

  var img = document.getElementById('logo-img');
  img.addEventListener('error', function () { img.hidden = true; document.getElementById('logo-text').hidden = false; });

  var burger = document.getElementById('burger');
  burger.addEventListener('click', function () {
    var open = menu.classList.toggle('open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  if (!hasSession && !startsWith(path, PUBLIC)) {
    document.getElementById('title').textContent = 'Inicia sesión para continuar';
    document.getElementById('msg').textContent = 'Esta pantalla es privada y no hay una sesión activa en este dispositivo. Inicia sesión cuando tengas conexión.';
    document.getElementById('login').hidden = false;
    document.getElementById('login').setAttribute('data-testid', 'offline-login');
  }

  var retry = document.getElementById('retry');
  var notice = document.getElementById('notice');
  var busy = false;
  retry.addEventListener('click', function () {
    if (busy) return;
    busy = true; retry.disabled = true; notice.hidden = true;
    var done = function (ok) {
      if (ok) { location.replace(location.href); return; }
      notice.hidden = false; retry.disabled = false; busy = false;
    };
    if (navigator.onLine === false) { done(false); return; }
    fetch('/sw.js', { method: 'HEAD', cache: 'no-store' }).then(function () { done(true); }, function () { done(false); });
  });

  // Cerrar sesión sin conexión (HU07): borra los datos privados de este equipo y deja el cierre pendiente.
  function clearPrivateCaches() {
    if (!window.caches) return Promise.resolve();
    return caches.keys().then(function (names) {
      return Promise.all(names.filter(function (n) { return n.indexOf('umsspira-routes') === 0 || n.indexOf('umsspira-core-portal') === 0 || n.indexOf('umsspira-static') === 0; }).map(function (n) {
        return caches.open(n).then(function (c) {
          return c.keys().then(function (reqs) {
            return Promise.all(reqs.filter(function (r) {
              var pth = new URL(r.url).pathname;
              return n.indexOf('umsspira-routes') === 0 || pth === '/portal' || pth.indexOf('/portal/') === 0;
            }).map(function (r) { return c['delete'](r); }));
          });
        });
      }));
    }).catch(function () {});
  }
  function doLogout(btn) {
    if (btn) btn.disabled = true;
    var finish = function () {
      try {
        localStorage.setItem('umsspira.offline.pending-logout', '1');
        localStorage.removeItem('umsspira.offline.session-validation');
        localStorage.removeItem('umsspira.offline.nav-user');
        sessionStorage.setItem('umsspira.offline.just-logged-out', '1');
      } catch (e) {}
      location.reload();
    };
    // Se borran páginas privadas guardadas y datos locales antes de recargar.
    clearPrivateCaches().then(function () {
      try {
        // Se borran las dos bases de QR: la actual y la que usa el detalle del pase.
        try { indexedDB.deleteDatabase('umsspira-event-passes'); } catch (e) {}
        var del = indexedDB.deleteDatabase('umsspira-offline');
        del.onsuccess = finish; del.onerror = finish; del.onblocked = finish;
      } catch (e) { finish(); }
    });
  }
  var logoutBtn = document.getElementById('logout');
  if (hasSession) {
    logoutBtn.hidden = false;
    logoutBtn.addEventListener('click', function () { doLogout(logoutBtn); });
    var out = document.createElement('button');
    out.type = 'button'; out.className = 'out'; out.textContent = 'Cerrar sesión';
    out.setAttribute('data-testid', 'offline-logout-menu');
    out.addEventListener('click', function () { doLogout(out); });
    menu.appendChild(out);
  }
  try {
    if (sessionStorage.getItem('umsspira.offline.just-logged-out') === '1') {
      sessionStorage.removeItem('umsspira.offline.just-logged-out');
      document.getElementById('logged-out').hidden = false;
    }
  } catch (e) {}

  // Eventos sin conexión: si esta pantalla no se guardó, se muestran los eventos que la app guardó la última vez que se abrió con red.
  function showSavedEvents() {
    if (!hasSession || notTitulado || !startsWith(path, ['/portal/eventos']) || !window.indexedDB) return;
    try {
      var open = indexedDB.open('umsspira-hu04');
      // Si la base no existía, NO se crea vacía (rompería el guardado posterior del catálogo): se cancela.
      open.onupgradeneeded = function (e) { try { e.target.transaction.abort(); } catch (err) {} };
      open.onerror = function () {};
      open.onsuccess = function () {
        var db = open.result;
        try {
          if (!db.objectStoreNames.contains('public-events')) { db.close(); return; }
          var get = db.transaction('public-events', 'readonly').objectStore('public-events').get('catalog');
          get.onsuccess = function () {
            var rec = get.result;
            db.close();
            if (!rec || !rec.events || !rec.events.length) return;
            var list = document.getElementById('events-ul');
            var shown = 0;
            rec.events.forEach(function (ev) {
              if (!ev || ev.status !== 'PUBLICADO' || shown >= 20) return;
              shown++;
              var li = document.createElement('li');
              var t = document.createElement('strong'); t.textContent = ev.title || 'Evento';
              li.appendChild(t);
              var when = '';
              try { when = new Date(ev.startDate).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) {}
              if (when) { var d = document.createElement('span'); d.textContent = when; li.appendChild(d); }
              if (ev.location) { var l = document.createElement('span'); l.textContent = ev.location; li.appendChild(l); }
              list.appendChild(li);
            });
            if (!shown) return;
            var note = document.getElementById('events-note');
            try { note.textContent = 'Última actualización: ' + new Date(rec.updatedAt).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' }) + ' · Para inscribirte necesitas conexión.'; } catch (e) {}
            document.getElementById('title').textContent = 'Sin conexión a Internet';
            document.getElementById('msg').textContent = 'No se pudo abrir la pantalla completa de eventos, pero esto es lo que tienes guardado.';
            document.getElementById('events-box').hidden = false;
          };
          get.onerror = function () { db.close(); };
        } catch (e) { try { db.close(); } catch (e2) {} }
      };
    } catch (e) {}
  }
  showSavedEvents();

  window.addEventListener('online', function () { if (!busy) { busy = true; location.replace(location.href); } }, { once: true });
})();
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

// Rutas de navegación que atiende el Service Worker (portal + secciones que se guardan para uso sin conexión).
const INTERCEPTED_PREFIXES = ['/portal', '/events', '/mis-pases', '/job-postings', '/mentorship', '/my-applications', '/profile', '/afinidad'];
function isInterceptedRoute(pathname) {
  return isOfflineRoute(pathname) || INTERCEPTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// --- NAVIGATION HANDLER ---
// Chrome marca la recarga (F5) con cache 'no-cache' y la recarga forzada (Ctrl+F5) con 'reload'.
function isHomeReload(request, url) {
  return (url.pathname === '/portal' || url.pathname === '/portal/') && (request.cache === 'reload' || request.cache === 'no-cache');
}

async function handleNavigation(event) {
  const request = event.request;
  const url = new URL(request.url);

  try {
    const response = await fetch(request);

    if (isOfflineRoute(url.pathname)) {
      if (canStoreOfflineRoute(response)) {
        // Clonar ANTES de cualquier operación asíncrona para no consumir el body.
        const copy = response.clone();
        event.waitUntil((async () => {
          try {
            const clean = await cleanResponse(copy);
            await safePut(ROUTES_CACHE, routeKey(url.pathname), clean, { maxEntries: 20 });
          } catch (e) {}
        })());
      }
      if (shouldSync(`route:${url.pathname}`, 5_000)) event.waitUntil(storeRouteHtml(url.pathname));
    }
    if (url.pathname.startsWith('/portal') && shouldSync('all-routes', 60_000)) {
      event.waitUntil(syncOfflineRoutes());
    }
    return response;
  } catch (e) {
    // F5 / recargar el inicio sin conexión: pantalla «Sin conexión a Internet» con los accesos disponibles.
    if (isHomeReload(request, url)) return offlineResponse();
    if (isOfflineRoute(url.pathname)) {
      const cache = await caches.open(ROUTES_CACHE);
      const cached =
        (await cache.match(routeKey(url.pathname), { ignoreSearch: true, ignoreVary: true })) ||
        (await cache.match(request, { ignoreSearch: true, ignoreVary: true }));
      if (cached) return cleanResponse(cached);
    }
    // Ruta que nunca se visitó: aviso «Sin conexión a Internet» con accesos a lo guardado (Mis QR, Eventos, Configuración).
    return offlineResponse();
  }
}

async function saveProfile(name) {
  if (!PROFILES[name]) return;
  const cache = await caches.open(CONFIG_CACHE);
  await safePut(CONFIG_CACHE, PROFILE_KEY, new Response(name));
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
    if (isCacheable(response)) await safePut(cacheName, request, response);
    return response;
  } catch (e) {
    const cached = (await cache.match(request)) || (await cache.match(request, { ignoreSearch: true }));
    if (cached) return cached;
    throw new Error('Recurso no disponible');
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = (await cache.match(request)) || (await cache.match(request, { ignoreSearch: true }));
  if (cached) return cached;
  const response = await fetch(request);
  if (isCacheable(response)) await safePut(cacheName, request, response);
  return response;
}

async function staleWhileRevalidate(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request).then(async (response) => {
    if (isCacheable(response)) {
      await safePut(cacheName, request, response, { maxEntries });
    }
    return response;
  }).catch(() => undefined);
  return cached || (await networkPromise) || new Response('Recurso no disponible sin conexión', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.mode === 'navigate') {
    const navUrl = new URL(request.url);
    // Solo pasan por aquí las secciones del portal (el homepage '/', '/me' u otras épicas NO se interceptan).
    const interceptar =
      navUrl.origin === self.location.origin &&
      !/^\/(api|auth|_next)(\/|$)/.test(navUrl.pathname) &&
      !/\.[a-z0-9]{2,5}$/i.test(navUrl.pathname) &&
      isInterceptedRoute(navUrl.pathname);
    if (!interceptar) return;
    event.respondWith(handleNavigation(event));
    return;
  }

  for (const route of EXT.routes) {
    try { if (route.match(new URL(request.url), request)) { event.respondWith(route.handle(event)); return; } } catch (e) {}
  }

  const url = getHandledUrl(request);
  if (!url) return;

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

// Lock para que dos UPDATE_CACHE no se solapen y corrompan cachés a medio escribir.
let updateLock = Promise.resolve();

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;
  if (data.type === 'SKIP_WAITING') { self.skipWaiting(); return; }
  if (data.type === 'SET_DEVICE_PROFILE') { event.waitUntil(saveProfile(data.profile)); return; }
  if (data.type === 'CACHE_OFFLINE_ROUTES') { event.waitUntil(syncOfflineRoutes()); return; }
  if (data.type === 'UPDATE_CACHE') {
    event.waitUntil((async () => {
      // Serializa ejecuciones: si ya hay una en curso, espera a que termine.
      const run = updateLock.then(async () => {
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
            try {
              const response = await fetch(url, { cache: 'no-store' });
              if (isCacheable(response)) await safePut(ASSETS_CACHE, url, response);
            } catch (e) {}
          }));

          await broadcast({ type: 'SW_LOG', message: 'Proceso completado con éxito.' });
          await broadcast({ type: 'CACHE_UPDATED' });
        } catch (error) {
          console.error('Error actualizando la caché manualmente:', error);
          await broadcast({ type: 'SW_LOG', message: '❌ Error en la actualización.' });
        }
      });
      updateLock = run.catch(() => {});
      await run;
    })());
    return;
  }
  const handler = EXT.messages[data.type];
  if (typeof handler === 'function') handler(event);
});