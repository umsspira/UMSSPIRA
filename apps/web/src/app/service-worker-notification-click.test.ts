/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';

/** Carga sw-extensions.js en un sandbox con un `self` simulado. */
function loadExtensions(clients: {
  matchAll: jest.Mock;
  openWindow?: jest.Mock;
} = { matchAll: jest.fn().mockResolvedValue([]), openWindow: jest.fn() }) {
  const listeners: Record<string, (event: any) => void> = {};
  const addEventListener = jest.fn((name: string, listener: (event: any) => void) => {
    listeners[name] = listener;
  });

  const sandbox: any = {
    self: {
      location: { origin: 'https://umsspira.test', hostname: 'umsspira.test' },
      addEventListener,
      UMSSPIRA_SW: { routes: [], messages: {} },
      clients,
      registration: { showNotification: jest.fn() },
      skipWaiting: jest.fn(),
      importScripts: undefined,
    },
    caches: {
      open: jest.fn().mockResolvedValue({ put: jest.fn(), match: jest.fn() }),
      keys: jest.fn().mockResolvedValue([]),
      match: jest.fn(),
    },
    fetch: jest.fn().mockResolvedValue({
      ok: true,
      clone: () => ({ text: async () => '' }),
      text: async () => '',
    }),
    URL,
    Response,
    console,
  };
  sandbox.self.clients = clients;

  runInNewContext(
    readFileSync(join(process.cwd(), 'public/sw-extensions.js'), 'utf8'),
    sandbox,
  );

  return { listeners, clients, self: sandbox.self };
}

function makeClickEvent(data: unknown) {
  return {
    notification: {
      close: jest.fn(),
      data,
    },
    waitUntil: jest.fn((promise: Promise<unknown>) => promise),
  };
}

describe('HU13 - T11: abrir el detalle del evento al tocar la notificación', () => {
  it('abre una nueva ventana con la URL del evento cuando no hay ventana abierta', async () => {
    const openWindow = jest.fn().mockResolvedValue(undefined);
    const { listeners } = loadExtensions({ matchAll: jest.fn().mockResolvedValue([]), openWindow });

    const event = makeClickEvent({ url: 'https://umsspira.test/portal/eventos/evt-123' });
    listeners.notificationclick(event);
    await event.waitUntil.mock.results[0].value;

    expect(event.notification.close).toHaveBeenCalled();
    expect(openWindow).toHaveBeenCalledWith('https://umsspira.test/portal/eventos/evt-123');
  });

  it('enfoca y navega una ventana existente del mismo origen', async () => {
    const focus = jest.fn().mockResolvedValue(undefined);
    const navigate = jest.fn().mockResolvedValue({ focus });
    const existing = { url: 'https://umsspira.test/portal', navigate, focus };
    const openWindow = jest.fn();
    const { listeners } = loadExtensions({
      matchAll: jest.fn().mockResolvedValue([existing]),
      openWindow,
    });

    const event = makeClickEvent({ url: 'https://umsspira.test/portal/eventos/evt-9' });
    listeners.notificationclick(event);
    await event.waitUntil.mock.results[0].value;

    expect(navigate).toHaveBeenCalledWith('https://umsspira.test/portal/eventos/evt-9');
    expect(focus).toHaveBeenCalled();
    expect(openWindow).not.toHaveBeenCalled();
  });

  it('arma la ruta del evento a partir de eventId cuando no hay url', async () => {
    const openWindow = jest.fn().mockResolvedValue(undefined);
    const { listeners } = loadExtensions({ matchAll: jest.fn().mockResolvedValue([]), openWindow });

    const event = makeClickEvent({ eventId: 'evt-77' });
    listeners.notificationclick(event);
    await event.waitUntil.mock.results[0].value;

    expect(openWindow).toHaveBeenCalledWith('https://umsspira.test/portal/eventos/evt-77');
  });

  it('abre una ventana nueva si la existente falla al navegar', async () => {
    const navigate = jest.fn().mockRejectedValue(new Error('no navegable'));
    const existing = { url: 'https://umsspira.test/portal', navigate, focus: jest.fn() };
    const openWindow = jest.fn().mockResolvedValue(undefined);
    const { listeners } = loadExtensions({
      matchAll: jest.fn().mockResolvedValue([existing]),
      openWindow,
    });

    const event = makeClickEvent({ url: 'https://umsspira.test/portal/eventos/evt-1' });
    listeners.notificationclick(event);
    await event.waitUntil.mock.results[0].value;

    expect(openWindow).toHaveBeenCalledWith('https://umsspira.test/portal/eventos/evt-1');
  });

  it('no abre URLs externas: cae al portal si el origen no coincide', async () => {
    const openWindow = jest.fn().mockResolvedValue(undefined);
    const { listeners } = loadExtensions({ matchAll: jest.fn().mockResolvedValue([]), openWindow });

    const event = makeClickEvent({ url: 'https://evil.example.com/phishing' });
    listeners.notificationclick(event);
    await event.waitUntil.mock.results[0].value;

    expect(openWindow).toHaveBeenCalledWith('https://umsspira.test/portal');
  });
});
