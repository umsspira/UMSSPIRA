/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';

describe('extensiones del service worker (sw-extensions.js - HU13)', () => {
  function loadExtensions() {
    const listeners: Record<string, (event: any) => void> = {};
    const addEventListener = jest.fn((name: string, listener: (event: any) => void) => {
      listeners[name] = listener;
    });
    const showNotification = jest.fn().mockResolvedValue(undefined);
    const openWindow = jest.fn().mockResolvedValue(undefined);
    const matchAll = jest.fn().mockResolvedValue([]);

    const context = {
      self: {
        location: { origin: 'https://umsspira.test', href: 'https://umsspira.test/sw.js' },
        addEventListener,
        registration: { showNotification },
        clients: { matchAll, openWindow },
        UMSSPIRA_SW: { routes: [], messages: {} },
      },
      URL,
      caches: { open: jest.fn() },
      fetch: jest.fn(),
    };

    runInNewContext(readFileSync(join(process.cwd(), 'public/sw-extensions.js'), 'utf8'), context);
    return { listeners, showNotification, matchAll, openWindow };
  }

  it('registra manejadores para push y notificationclick', () => {
    const { listeners } = loadExtensions();
    expect(listeners.push).toBeDefined();
    expect(listeners.notificationclick).toBeDefined();
  });

  it('muestra la notificación con el payload provisto en el evento push', async () => {
    const { listeners, showNotification } = loadExtensions();
    const waitUntil = jest.fn();

    listeners.push({
      data: {
        json: () => ({
          title: 'Evento cancelado',
          body: 'El evento fue cancelado',
          url: '/portal/eventos/ev-1',
        }),
      },
      waitUntil,
    });

    expect(waitUntil).toHaveBeenCalled();
    await waitUntil.mock.calls[0][0];

    expect(showNotification).toHaveBeenCalledWith(
      'Evento cancelado',
      expect.objectContaining({
        body: 'El evento fue cancelado',
        icon: '/icons/icon-192.png',
        data: { url: 'https://umsspira.test/portal/eventos/ev-1' },
      }),
    );
  });

  it('utiliza título e icono por defecto si el payload está vacío', async () => {
    const { listeners, showNotification } = loadExtensions();
    const waitUntil = jest.fn();

    listeners.push({
      data: null,
      waitUntil,
    });

    await waitUntil.mock.calls[0][0];
    expect(showNotification).toHaveBeenCalledWith(
      'UMSSPIRA',
      expect.objectContaining({
        body: '',
        icon: '/icons/icon-192.png',
        data: { url: 'https://umsspira.test/portal' },
      }),
    );
  });

  it('cierra la notificación y abre ventana al hacer clic si no hay clientes abiertos', async () => {
    const { listeners, openWindow } = loadExtensions();
    const waitUntil = jest.fn();
    const close = jest.fn();

    listeners.notificationclick({
      notification: {
        close,
        data: { url: 'https://umsspira.test/portal/eventos/ev-1' },
      },
      waitUntil,
    });

    expect(close).toHaveBeenCalled();
    await waitUntil.mock.calls[0][0];
    expect(openWindow).toHaveBeenCalledWith('https://umsspira.test/portal/eventos/ev-1');
  });

  it('enfoca una pestaña existente si ya está en la misma URL', async () => {
    const { listeners, matchAll, openWindow } = loadExtensions();
    const focus = jest.fn().mockResolvedValue(undefined);
    const existingClient = {
      url: 'https://umsspira.test/portal/eventos/ev-1',
      focus,
    };
    matchAll.mockResolvedValue([existingClient]);

    const waitUntil = jest.fn();
    listeners.notificationclick({
      notification: {
        close: jest.fn(),
        data: { url: 'https://umsspira.test/portal/eventos/ev-1' },
      },
      waitUntil,
    });

    await waitUntil.mock.calls[0][0];
    expect(focus).toHaveBeenCalled();
    expect(openWindow).not.toHaveBeenCalled();
  });
});
