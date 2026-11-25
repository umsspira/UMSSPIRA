/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';

// ---------------------------------------------------------------------------
// CacheStorage / Cache 100% realistas (basados en Map de Response)
// ---------------------------------------------------------------------------
type StoredResponse = { key: string; response: Response };

function makeCache() {
  const store = new Map<string, StoredResponse>();

  const keyOf = (input: any): string => {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.href;
    if (input && typeof input.url === 'string') return input.url;
    return String(input);
  };

  const cache: any = {
    match: jest.fn(async (input: any, _opts?: any) => store.get(keyOf(input))?.response),
    matchAll: jest.fn(async () => [...store.values()].map((v) => v.response)),
    put: jest.fn(async (input: any, response: Response) => {
      const key = keyOf(input);
      store.set(key, { key, response: response.clone() });
    }),
    delete: jest.fn(async (input: any) => store.delete(keyOf(input))),
    // AQUÍ ESTÁ LA CORRECCIÓN 3: Usar base URL absoluta para crear el Request
    keys: jest.fn(async () => [...store.values()].map((v) => new Request(new URL(v.key, 'https://umsspira.test').href))),
    add: jest.fn(async (input: any) => {
      const res = await (globalThis.fetch as any)(input);
      if (!res.ok) throw new Error(`add failed: ${keyOf(input)}`);
      store.set(keyOf(input), { key: keyOf(input), response: res.clone() });
    }),
    addAll: jest.fn(async (inputs: any[]) => {
      await Promise.all(inputs.map((i) => cache.add(i)));
    }),
    _store: store,
  };

  return cache;
}

function makeCacheStorage() {
  const caches = new Map<string, any>();
  return {
    open: jest.fn(async (name: string) => {
      if (!caches.has(name)) caches.set(name, makeCache());
      return caches.get(name)!;
    }),
    has: jest.fn(async (name: string) => caches.has(name)),
    delete: jest.fn(async (name: string) => caches.delete(name)),
    keys: jest.fn(async (): Promise<string[]> => Array.from(caches.keys())),
    match: jest.fn(async (input: any) => {
      for (const cache of caches.values()) {
        const hit = await cache.match(input);
        if (hit) return hit;
      }
      return undefined;
    }),
    _caches: caches,
  };
}

// ---------------------------------------------------------------------------
// Carga del SW real en un sandbox con globals de navegador realistas
// ---------------------------------------------------------------------------
type LoadOptions = {
  fetchImpl?: (input: any, init?: any) => Promise<Response>;
  htmlForRoutes?: Record<string, string>;
};

function loadWorker(opts: LoadOptions = {}) {
  const listeners: Record<string, (event: any) => void> = {};
  const addEventListener = jest.fn((name: string, listener: (event: any) => void) => {
    listeners[name] = listener;
  });

  const cacheStorage = makeCacheStorage();
  const calls: string[] = [];

  const fetchImpl = opts.fetchImpl ?? (async (input: any) => {
    const url = typeof input === 'string' ? input : input.url;
    calls.push(url);
    
    if (opts.htmlForRoutes && opts.htmlForRoutes[url] !== undefined) {
      const response = new Response(opts.htmlForRoutes[url], {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
      // AQUÍ ESTÁ LA CORRECCIÓN 1: Mockear url para que el SW sepa que no es /login
      Object.defineProperty(response, 'url', { value: `https://umsspira.test${url}` });
      return response;
    }
    
    // Los assets genéricos devuelven 200 ok
    return new Response('ok', { status: 200, headers: { 'content-type': 'text/plain' } });
  });

  const sandbox: any = {
    self: {
      location: { origin: 'https://umsspira.test', hostname: 'umsspira.test', href: 'https://umsspira.test/sw.js' },
      addEventListener,
      skipWaiting: jest.fn(),
      clients: { claim: jest.fn(), matchAll: jest.fn(async () => []) },
      registration: { showNotification: jest.fn(async () => undefined) },
      importScripts: jest.fn(),
      UMSSPIRA_SW: { routes: [], messages: {} },
    },
    caches: cacheStorage,
    fetch: (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : input.url;
      calls.push(url);
      return fetchImpl(input, init);
    },
    URL,
    Response,
    Request,
    Headers,
    console,
    setTimeout,
    clearTimeout,
    Promise,
  };

  runInNewContext(readFileSync(join(process.cwd(), 'public/sw.js'), 'utf8'), sandbox);

  return { listeners, addEventListener, cacheStorage, calls, self: sandbox.self };
}

async function runInstall(listeners: Record<string, (event: any) => void>) {
  const pending: Promise<unknown>[] = [];
  listeners.install({ waitUntil: (p: Promise<unknown>) => pending.push(p) });
  await Promise.all(pending);
}

// Función auxiliar para simular caída de red
const offlineFetch = async (_input: any, _init?: any): Promise<Response> => {
  throw new Error('Sin conexión');
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('service worker del portal', () => {
  it('carga sin declaraciones duplicadas y registra un único manejador por evento', () => {
    const { addEventListener } = loadWorker();
    for (const name of ['install', 'activate', 'fetch', 'message']) {
      expect(addEventListener.mock.calls.filter(([event]) => event === name)).toHaveLength(1);
    }
  });

  it('HU06: una versión nueva no se activa sola al instalarse; solo con el mensaje SKIP_WAITING', async () => {
    const { listeners, self } = loadWorker();
    await runInstall(listeners);
    expect(self.skipWaiting).not.toHaveBeenCalled();

    listeners.message({ data: { type: 'SKIP_WAITING' }, waitUntil: () => undefined });
    expect(self.skipWaiting).toHaveBeenCalledTimes(1);
  });

  it('no intercepta el homepage ni las consultas de otras épicas', () => {
    const { listeners } = loadWorker();
    for (const path of ['/', '/me', '/graduates-report', '/api/events']) {
      const respondWith = jest.fn();
      listeners.fetch({
        request: { method: 'GET', url: `https://umsspira.test${path}`, headers: new Headers(), mode: 'navigate' },
        respondWith,
      });
      expect(respondWith).not.toHaveBeenCalled();
    }
  });

  it('mantiene el aviso sin conexión cuando el portal no está en caché', async () => {
    const { listeners } = loadWorker({ fetchImpl: offlineFetch });
    const respondWith = jest.fn();
    listeners.fetch({
      request: { method: 'GET', url: 'https://umsspira.test/portal', headers: new Headers(), mode: 'navigate' },
      respondWith,
    });
    const response: Response = await respondWith.mock.calls[0][0];
    expect(await response.text()).toContain('Sin conexión');
  });

  it('recargar (F5 o Ctrl+F5) el inicio sin conexión muestra la pantalla «Sin conexión a Internet»; un enlace normal no', async () => {
    for (const cache of ['no-cache', 'reload']) {
      const { listeners } = loadWorker({ fetchImpl: offlineFetch });
      const respondWith = jest.fn();
      listeners.fetch({
        request: { method: 'GET', url: 'https://umsspira.test/portal', headers: new Headers(), mode: 'navigate', cache },
        respondWith,
      });
      const html = await (await respondWith.mock.calls[0][0] as Response).text();
      expect(html).toContain('Sin conexión a Internet');
      expect(html).toContain('Disponible sin conexión');
    }
  });

  async function pantallaSinConexion(path: string) {
    const { listeners } = loadWorker({ fetchImpl: offlineFetch });
    const respondWith = jest.fn();
    listeners.fetch({
      request: { method: 'GET', url: `https://umsspira.test${path}`, headers: new Headers(), mode: 'navigate' },
      respondWith,
    });
    const response: Response = await respondWith.mock.calls[0][0];
    return response.text();
  }

  it('HU14 CA-01/CA-04: la página de respaldo explica el caso y ofrece Mis QR, Eventos y Configuración', async () => {
    const html = await pantallaSinConexion('/portal/mensajes');
    for (const text of [
      'Sin conexión a Internet', 'Esta pantalla todavía no se guardó en tu dispositivo', 'Reintentar',
      'Todavía no hay conexión', 'Disponible sin conexión', 'Mis códigos QR', 'Eventos visitados', 'Configuración',
    ]) expect(html).toContain(text);
    for (const id of ['offline-title', 'offline-retry', 'offline-link-passes', 'offline-link-events']) {
      expect(html).toContain(`data-testid="${id}"`);
    }
  });

  it('HU09 CA-02: el acceso a Mis códigos QR es destacado, apunta a /mis-pases y va antes que los otros accesos', async () => {
    const html = await pantallaSinConexion('/portal/mensajes');
    const hero = /<a class="qr-hero" href="\/mis-pases" data-testid="offline-link-passes">/;
    expect(html).toMatch(hero);
    // Destacado: usa la clase .qr-hero y aparece antes que el tile de Eventos.
    expect(html.indexOf('class="qr-hero"')).toBeLessThan(html.indexOf('data-testid="offline-link-events"'));
    // La grilla de tiles restantes pasa a 2 columnas (el QR ya no ocupa una celda).
    expect(html).toContain('.tiles{display:grid;grid-template-columns:repeat(2,1fr)');
  });

  it('HU14 CA-06: pide iniciar sesión en rutas privadas cuando no hay sesión', async () => {
    const html = await pantallaSinConexion('/portal/mensajes');
    expect(html).toContain('Inicia sesión para continuar');
    expect(html).toContain('/portal/institucional');
  });

  it('HU15: el menú de la pantalla sin conexión usa las mismas opciones y el mismo orden que la barra', async () => {
    const { navigationFor } = await import('@/shared/components/navbar/navigation');
    const html = await pantallaSinConexion('/portal/mensajes');
    const member = JSON.parse(/var NAV_MEMBER = (\[.*?\]);/s.exec(html)![1]) as { label: string }[];
    const guest = JSON.parse(/var NAV_GUEST = (\[.*?\]);/s.exec(html)![1]) as { label: string }[];
    expect(member.map((item) => item.label)).toEqual(['Inicio', ...navigationFor('titulado').map((s) => s.label)]);
    expect(guest.map((item) => item.label)).toEqual(['Inicio', ...navigationFor(null).map((s) => s.label)]);
  });

  it('secciones principales: se guardan al visitarlas, así que pasan por el Service Worker', () => {
    for (const path of ['/portal', '/portal/comunidad', '/portal/beneficios', '/portal/empleos', '/job-postings', '/mentorship/directory']) {
      const { listeners } = loadWorker();
      const respondWith = jest.fn();
      listeners.fetch({
        request: { method: 'GET', url: `https://umsspira.test${path}`, headers: new Headers(), mode: 'navigate' },
        respondWith,
      });
      expect(respondWith).toHaveBeenCalled();
    }
  });

  it('secciones principales: una sección que nunca se visitó muestra el aviso sin conexión y no una pantalla vacía', async () => {
    const html = await pantallaSinConexion('/job-postings');
    expect(html).toContain('Sin conexión a Internet');
    expect(html).toContain('Esta pantalla todavía no se guardó en tu dispositivo');
  });

  it('la pantalla sin conexión permite cerrar sesión y borra también las páginas privadas guardadas', async () => {
    const html = await pantallaSinConexion('/portal/mensajes');
    expect(html).toContain("'umsspira.offline.pending-logout'");
    expect(html).toContain('offline-logout');
    expect(html).toContain("indexedDB.deleteDatabase('umsspira-offline')");
    expect(html).toContain("n.indexOf('umsspira-routes') === 0");
  });

  it('Eventos sin conexión: si la pantalla no estaba guardada, el aviso lista el catálogo guardado (umsspira-hu04)', async () => {
    const html = await pantallaSinConexion('/portal/eventos');
    expect(html).toContain('offline-events-box');
    expect(html).toContain("indexedDB.open('umsspira-hu04')");
    expect(html).toContain("'public-events'");
    // No debe crear la base vacía si no existía.
    expect(html).toContain('transaction.abort()');
    // Un solo bloque de eventos (sin ids repetidos).
    expect(html.match(/id="events-box"/g)).toHaveLength(1);
  });

  it('HU08: las pantallas de Mis QR (/events/catalog/passes y /mis-pases) pasan por el Service Worker', () => {
    for (const path of ['/events/catalog/passes', '/mis-pases', '/mis-pases/abc']) {
      const { listeners } = loadWorker();
      const respondWith = jest.fn();
      listeners.fetch({
        request: { method: 'GET', url: `https://umsspira.test${path}`, headers: new Headers(), mode: 'navigate' },
        respondWith,
      });
      expect(respondWith).toHaveBeenCalled();
    }
  });

  it('HU08: al guardar Mis QR también guarda los archivos de rutas con paréntesis (grupos de Next)', async () => {
    const html = [
      '<link rel="stylesheet" href="/_next/static/css/app/(dashboard)/layout.css?v=1"/>',
      '<script src="/_next/static/chunks/app/(dashboard)/events/catalog/passes/page.js" async></script>',
      '<style>@font-face{src:url(/_next/static/media/a.woff2)}</style>',
      '<script>self.__next_f.push([1,"6:[\\"static/chunks/app/(dashboard)/events/catalog/passes/page-abc.js\\"]"])</script>',
    ].join('');

    const { listeners, calls } = loadWorker({
      htmlForRoutes: { '/events/catalog/passes': html },
    });

    await runInstall(listeners);

    expect(calls).toEqual(expect.arrayContaining([
      '/_next/static/css/app/(dashboard)/layout.css?v=1',
      '/_next/static/chunks/app/(dashboard)/events/catalog/passes/page.js',
      '/_next/static/media/a.woff2',
      '/_next/static/chunks/app/(dashboard)/events/catalog/passes/page-abc.js',
    ]));

    expect(calls).not.toContain('/_next/static/css/app/(dashboard');
  });

  it('HU08 (verificación de caché): los assets quedan realmente guardados en STATIC_CACHE', async () => {
    const html = [
      '<link rel="stylesheet" href="/_next/static/css/app/(dashboard)/layout.css?v=1"/>',
      '<script src="/_next/static/chunks/app/(dashboard)/events/catalog/passes/page.js" async></script>',
    ].join('');

    const { listeners, cacheStorage } = loadWorker({
      htmlForRoutes: { '/events/catalog/passes': html },
    });

    await runInstall(listeners);

    const allCacheNames = await cacheStorage.keys();
    const staticName = allCacheNames.find((n) => n.startsWith('umsspira-static-'));
    expect(staticName).toBeDefined();
    
    if (staticName) {
      const staticCache = cacheStorage._caches.get(staticName);
      expect(staticCache).toBeDefined();
      if (staticCache) {
        const keys = await staticCache.keys();
        const urls = keys.map((req: any) => String(req.url));
        // Usamos .some() para buscar dentro de las URLs
        expect(urls.some((u: string) => u.includes('layout.css'))).toBe(true);
        expect(urls.some((u: string) => u.includes('page.js'))).toBe(true);
      }
    }
  });
});