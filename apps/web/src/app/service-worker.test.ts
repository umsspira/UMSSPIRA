/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';

function loadWorker(fetchImpl: (input: any) => Promise<any> = async () => { throw new Error('Sin conexión'); }) {
  const listeners: Record<string, (event: any) => void> = {};
  const addEventListener = jest.fn((name: string, listener: (event: any) => void) => {
    listeners[name] = listener;
  });
  const cache = { match: jest.fn(), put: jest.fn(), addAll: jest.fn(), keys: async () => [], delete: jest.fn() };
  runInNewContext(readFileSync(join(process.cwd(), 'public/sw.js'), 'utf8'), {
    self: {
      location: { origin: 'https://umsspira.test', hostname: 'umsspira.test' },
      addEventListener, skipWaiting: jest.fn(), clients: { claim: jest.fn() },
    },
    caches: { open: async () => cache, match: async () => undefined },
    fetch: fetchImpl,
    URL, Response, Request,
  });
  return { listeners, addEventListener };
}

describe('service worker del portal', () => {
  it('carga sin declaraciones duplicadas y registra un único manejador por evento', () => {
    const { addEventListener } = loadWorker();
    for (const name of ['install', 'activate', 'fetch', 'message']) {
      expect(addEventListener.mock.calls.filter(([event]) => event === name)).toHaveLength(1);
    }
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
    const { listeners } = loadWorker();
    const respondWith = jest.fn();
    listeners.fetch({
      request: { method: 'GET', url: 'https://umsspira.test/portal', headers: new Headers(), mode: 'navigate' },
      respondWith,
    });
    const response: Response = await respondWith.mock.calls[0][0];
    expect(await response.text()).toContain('Sin conexión');
  });

  async function pantallaSinConexion(path: string) {
    const { listeners } = loadWorker();
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
    expect(html).toContain('/portal/institucional'); // única parte pública de /portal
  });

  it('HU15: el menú de la pantalla sin conexión usa las mismas opciones y el mismo orden que la barra', async () => {
    const { navigationFor } = await import('@/shared/components/navbar/navigation');
    const html = await pantallaSinConexion('/portal/mensajes');
    const member = JSON.parse(/var NAV_MEMBER = (\[.*?\]);/s.exec(html)![1]) as { label: string }[];
    const guest = JSON.parse(/var NAV_GUEST = (\[.*?\]);/s.exec(html)![1]) as { label: string }[];
    expect(member.map(item => item.label)).toEqual(['Inicio', ...navigationFor('titulado').map(section => section.label)]);
    expect(guest.map(item => item.label)).toEqual(['Inicio', ...navigationFor(null).map(section => section.label)]);
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
    const fetched: string[] = [];
    const html = [
      '<link rel="stylesheet" href="/_next/static/css/app/(dashboard)/layout.css?v=1"/>',
      '<script src="/_next/static/chunks/app/(dashboard)/events/catalog/passes/page.js" async></script>',
      '<style>@font-face{src:url(/_next/static/media/a.woff2)}</style>',
      '<script>self.__next_f.push([1,"6:[\\"static/chunks/app/(dashboard)/events/catalog/passes/page-abc.js\\"]"])</script>',
    ].join('');
    const fetchImpl = async (input: any) => {
      const url = String(typeof input === 'string' ? input : input.url);
      fetched.push(url);
      if (url === '/events/catalog/passes') {
        return {
          ok: true, status: 200, type: 'basic', redirected: false, url: 'https://umsspira.test/events/catalog/passes',
          headers: { get: () => 'text/html; charset=utf-8' }, clone() { return this; }, text: async () => html,
        };
      }
      return { ok: true, status: 200, type: 'basic', clone() { return this; } };
    };
    const { listeners } = loadWorker(fetchImpl);
    const pending: Promise<unknown>[] = [];
    listeners.install({ waitUntil: (promise: Promise<unknown>) => pending.push(promise) });
    await Promise.all(pending);
    expect(fetched).toEqual(expect.arrayContaining([
      '/_next/static/css/app/(dashboard)/layout.css?v=1',
      '/_next/static/chunks/app/(dashboard)/events/catalog/passes/page.js',
      '/_next/static/media/a.woff2',
      '/_next/static/chunks/app/(dashboard)/events/catalog/passes/page-abc.js',
    ]));
    expect(fetched).not.toContain('/_next/static/css/app/(dashboard');
  });
});
