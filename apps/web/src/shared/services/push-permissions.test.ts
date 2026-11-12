import {
  detectPushSupport,
  getPushPermission,
  requestPushPermission,
} from './push-permissions';

describe('permisos de notificaciones Push (HU13 - T7)', () => {
  const originalNotification = (global as unknown as { Notification?: unknown }).Notification;
  const originalIsSecureContext = Object.getOwnPropertyDescriptor(window, 'isSecureContext');

  afterEach(() => {
    (global as unknown as { Notification?: unknown }).Notification = originalNotification;
    if (originalIsSecureContext) {
      Object.defineProperty(window, 'isSecureContext', originalIsSecureContext);
    }
    delete (window as unknown as { PushManager?: unknown }).PushManager;
  });

  const setNotification = (permission: NotificationPermission, request = jest.fn()) => {
    (global as unknown as { Notification: unknown }).Notification = Object.assign(
      function NotificationMock() {},
      { permission, requestPermission: request },
    );
  };

  it('detecta soporte completo cuando existen todas las APIs', () => {
    setNotification('default');
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
    (window as unknown as { PushManager: unknown }).PushManager = function () {};
    Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true });

    expect(detectPushSupport()).toEqual({ supported: true });
  });

  it('informa cuando el contexto no es seguro', () => {
    setNotification('default');
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });

    expect(detectPushSupport()).toEqual({ supported: false, reason: 'insecure-context' });
  });

  it('informa cuando no existe la API de notificaciones', () => {
    (global as unknown as { Notification?: unknown }).Notification = undefined;
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });

    expect(detectPushSupport()).toEqual({ supported: false, reason: 'no-notification-api' });
  });

  it('devuelve el permiso actual del navegador', () => {
    setNotification('granted');
    expect(getPushPermission()).toBe('granted');
  });

  it('no solicita permiso si el navegador no lo soporta', async () => {
    const request = jest.fn();
    setNotification('default', request);
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });

    await expect(requestPushPermission()).resolves.toBe('default');
    expect(request).not.toHaveBeenCalled();
  });

  it('solicita permiso y devuelve el resultado concedido', async () => {
    const request = jest.fn().mockResolvedValue('granted');
    setNotification('default', request);
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
    (window as unknown as { PushManager: unknown }).PushManager = function () {};
    Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true });

    await expect(requestPushPermission()).resolves.toBe('granted');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('no vuelve a solicitar si el permiso ya fue decidido', async () => {
    const request = jest.fn();
    setNotification('denied', request);
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
    (window as unknown as { PushManager: unknown }).PushManager = function () {};
    Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true });

    await expect(requestPushPermission()).resolves.toBe('denied');
    expect(request).not.toHaveBeenCalled();
  });
});

