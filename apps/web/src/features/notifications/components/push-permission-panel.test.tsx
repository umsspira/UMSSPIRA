import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { PushPermissionPanel } from './push-permission-panel';

describe('PushPermissionPanel (HU13 - T7)', () => {
  const originalNotification = (global as unknown as { Notification?: unknown }).Notification;

  const setupBrowser = (
    permission: NotificationPermission,
    supported = true,
    requestPermission = jest.fn().mockResolvedValue('granted'),
  ) => {
    (global as unknown as { Notification: unknown }).Notification = Object.assign(
      function NotificationMock() {},
      { permission, requestPermission },
    );
    Object.defineProperty(window, 'isSecureContext', { value: supported, configurable: true });
    if (supported) {
      (window as unknown as { PushManager: unknown }).PushManager = function () {};
      Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true });
    }
    return requestPermission;
  };

  afterEach(() => {
    (global as unknown as { Notification?: unknown }).Notification = originalNotification;
  });

  it('muestra el botón para activar cuando el permiso está pendiente', () => {
    setupBrowser('default');
    render(<PushPermissionPanel />);
    expect(screen.getByRole('button', { name: /activar notificaciones/i })).toBeTruthy();
  });

  it('solicita el permiso al pulsar el botón', async () => {
    const requestPermission = setupBrowser('default');
    render(<PushPermissionPanel />);

    fireEvent.click(screen.getByRole('button', { name: /activar notificaciones/i }));

    await waitFor(() => expect(requestPermission).toHaveBeenCalledTimes(1));
    await screen.findByText(/notificaciones push activadas/i);
  });

  it('muestra el estado activo cuando el permiso ya fue concedido', () => {
    setupBrowser('granted');
    render(<PushPermissionPanel />);
    expect(screen.getByText(/notificaciones push activadas/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /activar notificaciones/i })).toBeNull();
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
