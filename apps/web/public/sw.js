const VERSION = 'v9.0.0';

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

// Archivos de /_next/static que usa una página (estilos, scripts, fuentes). Se leen del HTML y de los datos de React.
// Admite paréntesis: los grupos de rutas de Next (por ejemplo app/(dashboard)/...) los llevan en el nombre del archivo.
function extractStaticUrls(text) {
  const found = new Set();
  const add = (raw) => {
    let url = raw;
    // Un ")" de más al final viene de un url(...) de CSS, no del nombre del archivo.
    while (url.endsWith(')') && (url.match(/\)/g) || []).length > (url.match(/\(/g) || []).length) url = url.slice(0, -1);
    found.add(url);
  };
  for (const match of text.match(/\/_next\/static\/[^"'\s\\<>{};]+/g) || []) add(match);
  // Los datos de React citan los archivos como "static/chunks/..." sin el prefijo /_next/.
  for (const match of text.matchAll(/["'](static\/(?:chunks|css|media)\/[^"'\s\\<>{};]+)/g)) add('/_next/' + match[1]);
  return [...found];
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

    const urls = extractStaticUrls(html);
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
    const urls = extractStaticUrls(html);
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

// --- PÁGINA SIN CONEXIÓN (HU14) ---
// HTML autónomo: no depende de Next.js, así que se muestra aunque la ruta pedida nunca se haya guardado.
// La pantalla se sirve en la MISMA URL que se pidió, por eso "Reintentar" recarga esa ruta.

// Menú de la barra de la pantalla sin conexión. Debe tener las mismas etiquetas y el mismo orden que
// NAVBAR_SECTIONS (src/shared/components/navbar/navigation.ts); service-worker.test.ts avisa si se desincronizan.
const OFFLINE_NAV_MEMBER = [
  { label: 'Inicio', href: '/portal', prefixes: [] },
  { label: 'Comunidad', href: '/portal/comunidad', prefixes: ['/portal/comunidad', '/portal/beneficios'] },
  { label: 'Directorio', href: '/profile', prefixes: ['/profile', '/afinidad'] },
  { label: 'Bolsa de trabajo', href: '/job-postings', prefixes: ['/portal/empleos', '/job-postings'] },
  { label: 'Mentorías', href: '/mentorship', prefixes: ['/portal/mentorias', '/mentorship'] },
  { label: 'Eventos', href: '/portal/eventos', prefixes: ['/portal/eventos', '/events'] },
];
const OFFLINE_NAV_GUEST = [
  { label: 'Inicio', href: '/portal/institucional', prefixes: [] },
  { label: 'Comunidad', href: '/portal/institucional?tab=comunidad', prefixes: [] },
  { label: 'Bolsa de trabajo', href: '/portal/institucional?tab=empleos', prefixes: [] },
  { label: 'Mentorías', href: '/portal/institucional?tab=mentorias', prefixes: [] },
  { label: 'Eventos', href: '/portal/institucional?tab=eventos', prefixes: [] },
];
// Todo /portal exige sesión salvo el portal institucional (misma regla que middleware.ts).
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
  .tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
  .tile{display:flex;align-items:center;gap:8px;min-height:44px;padding:10px 14px;border-radius:8px;background:#fff;color:#1B2632;text-decoration:none;font-size:.85rem}
  .tile:hover{background:#FFF1DC}
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
    <div class="avail">
      <h2>Disponible sin conexión</h2>
      <div class="tiles">
        <a class="tile" href="/events/catalog/passes" data-testid="offline-link-passes">&#9638; Mis códigos QR</a>
        <a class="tile" href="/portal/eventos" data-testid="offline-link-events">&#128197; Eventos visitados</a>
        <a class="tile" href="/portal/configuracion" data-testid="offline-link-settings">&#9881; Configuración</a>
      </div>
    </div>
  </section>
  <p class="foot">UMSSPIRA · Tu comunidad, siempre conectada</p>
</main>
<script>
(function () {
  var NAV_MEMBER = ${JSON.stringify(OFFLINE_NAV_MEMBER)};
  var NAV_GUEST = ${JSON.stringify(OFFLINE_NAV_GUEST)};
  var PUBLIC = ${JSON.stringify(OFFLINE_PUBLIC_PREFIXES)};
  var MAX_AGE = 7 * 24 * 60 * 60 * 1000; // misma vigencia que offline-session.ts (HU07)
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

  var img = document.getElementById('logo-img');
  img.addEventListener('error', function () { img.hidden = true; document.getElementById('logo-text').hidden = false; });

  var burger = document.getElementById('burger');
  burger.addEventListener('click', function () {
    var open = menu.classList.toggle('open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  // HU14 CA-06: ruta privada sin sesión autorizada → se pide iniciar sesión, nunca se muestra contenido privado.
  if (!hasSession && !startsWith(path, PUBLIC)) {
    document.getElementById('title').textContent = 'Inicia sesión para continuar';
    document.getElementById('msg').textContent = 'Esta pantalla es privada y no hay una sesión activa en este dispositivo. Inicia sesión cuando tengas conexión.';
    document.getElementById('login').hidden = false;
    document.getElementById('login').setAttribute('data-testid', 'offline-login');
  }

  // HU14 CA-02/CA-03: Reintentar solo recarga la ruta pedida si de verdad volvió la red; si no, avisa y se queda.
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
    // /sw.js nunca pasa por el Service Worker: sirve para comprobar la red real.
    fetch('/sw.js', { method: 'HEAD', cache: 'no-store' }).then(function () { done(true); }, function () { done(false); });
  });

  // Al volver la red se abre sola la ruta pedida (una sola vez, sin ciclos de recarga).
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
    // En desarrollo Next agrega ?v=... y cambia entre cargas: sin conexión se usa la copia aunque el parámetro difiera.
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
