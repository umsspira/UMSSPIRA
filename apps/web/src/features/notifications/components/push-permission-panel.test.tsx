import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { PushPermissionPanel } from './push-permission-panel';

jest.mock('@/shared/services/push-subscription', () => ({
  getVapidPublicKey: () => 'BPublicKeyValidaParaPruebas_1234567890',
  urlBase64ToUint8Array: () => new Uint8Array([1, 2, 3]),
  toSubscriptionInput: (s: { endpoint: string }) => ({
    endpoint: s.endpoint,
    keys: { p256dh: 'p', auth: 'a' },
  }),
  savePushSubscription: jest.fn().mockResolvedValue({ id: 'sub-1' }),
  removePushSubscription: jest.fn().mockResolvedValue(undefined),
}));

import * as pushSub from '@/shared/services/push-subscription';

describe('PushPermissionPanel (HU13 - T7 y T8)', () => {
  const originalNotification = (global as unknown as { Notification?: unknown }).Notification;

  const fakeSubscription = {
    endpoint: 'https://push.example.com/abc',
    toJSON: () => ({ endpoint: 'https://push.example.com/abc', keys: { p256dh: 'p', auth: 'a' } }),
    unsubscribe: jest.fn().mockResolvedValue(true),
  };

  const setupBrowser = (
    permission: NotificationPermission,
    supported = true,
    requestPermission = jest.fn().mockResolvedValue('granted'),
    existingSubscription: unknown = null,
  ) => {
    (global as unknown as { Notification: unknown }).Notification = Object.assign(
      function NotificationMock() {},
      { permission, requestPermission },
    );
    Object.defineProperty(window, 'isSecureContext', { value: supported, configurable: true });

    if (supported) {
      (window as unknown as { PushManager: unknown }).PushManager = function () {};
      const registration = {
        pushManager: {
          getSubscription: jest.fn().mockResolvedValue(existingSubscription),
          subscribe: jest.fn().mockResolvedValue(fakeSubscription),
        },
      };
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { ready: Promise.resolve(registration) },
        configurable: true,
      });
    }
    return requestPermission;
  };

  afterEach(() => {
    (global as unknown as { Notification?: unknown }).Notification = originalNotification;
    jest.clearAllMocks();
  });

  it('muestra el botón para activar cuando el permiso está pendiente', () => {
    setupBrowser('default');
    render(<PushPermissionPanel />);
    expect(screen.getByRole('button', { name: /activar notificaciones/i })).toBeTruthy();
  });

  it('solicita permiso y registra la suscripción al activar', async () => {
    const requestPermission = setupBrowser('default');
    render(<PushPermissionPanel />);

    fireEvent.click(screen.getByRole('button', { name: /activar notificaciones/i }));

    await waitFor(() => expect(requestPermission).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(pushSub.savePushSubscription).toHaveBeenCalledTimes(1));
    await screen.findByRole('button', { name: /desactivar notificaciones/i });
  });

  it('permite desactivar la suscripción y elimina en la API', async () => {
    setupBrowser('granted', true, jest.fn(), fakeSubscription);
    render(<PushPermissionPanel />);

    // Con permiso concedido, se ofrece activar la suscripción primero.
    fireEvent.click(screen.getByRole('button', { name: /activar notificaciones/i }));
    const boton = await screen.findByRole('button', { name: /desactivar notificaciones/i });

    fireEvent.click(boton);

    await waitFor(() => expect(pushSub.removePushSubscription).toHaveBeenCalled());
    await screen.findByRole('button', { name: /activar notificaciones/i });
  });

  it('informa cuando el permiso fue bloqueado', () => {
    setupBrowser('denied');
    render(<PushPermissionPanel />);
    expect(screen.getByText(/bloqueaste las notificaciones/i)).toBeTruthy();
  });

  it('avisa cuando el navegador no soporta notificaciones', () => {
    setupBrowser('default', false);
    render(<PushPermissionPanel />);
    expect(screen.getByText(/no admite|requieren una conexión segura/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /activar notificaciones/i })).toBeNull();
  });
});
