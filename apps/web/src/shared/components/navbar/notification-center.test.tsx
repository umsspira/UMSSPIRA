import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { NotificationCenter } from './notification-center';

jest.mock('@/shared/services/push-subscription', () => ({
  getVapidPublicKey: () => 'BPublicKeyValidaParaPruebas_1234567890',
  urlBase64ToUint8Array: () => new Uint8Array([1, 2, 3]),
  toSubscriptionInput: (s: { endpoint: string }) => ({
    endpoint: s.endpoint,
    keys: { p256dh: 'p', auth: 'a' },
  }),
  listPushSubscriptions: jest.fn().mockResolvedValue([]),
  savePushSubscription: jest.fn().mockResolvedValue({ id: 'sub-1' }),
  removePushSubscription: jest.fn().mockResolvedValue(undefined),
}));

import * as pushSub from '@/shared/services/push-subscription';

describe('NotificationCenter (HU13 - ventanas de avisos)', () => {
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
        scope: 'http://localhost/',
        active: {},
        pushManager: {
          getSubscription: jest.fn().mockResolvedValue(existingSubscription),
          subscribe: jest.fn().mockResolvedValue(fakeSubscription),
        },
      };
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve(registration),
          getRegistrations: jest.fn().mockResolvedValue([registration]),
        },
        configurable: true,
      });
    }
    return requestPermission;
  };

  const renderCenter = (onClose = jest.fn()) =>
    render(<NotificationCenter items={[]} resolveHref={href => href} onClose={onClose} onNavigate={jest.fn()} />);

  afterEach(() => {
    (global as unknown as { Notification?: unknown }).Notification = originalNotification;
    jest.clearAllMocks();
  });

  it('muestra la lista vacía con «Configurar avisos» y «Cerrar»', async () => {
    setupBrowser('default');
    const onClose = jest.fn();
    renderCenter(onClose);

    expect(await screen.findByText('No tienes notificaciones nuevas.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Configurar avisos' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('muestra avisos guardados y marca uno como leído al abrir el evento', async () => {
    setupBrowser('default');
    const onNotificationRead = jest.fn().mockResolvedValue(undefined);
    const onNavigate = jest.fn();
    render(
      <NotificationCenter
        items={[{
          id: 'notification-1',
          title: 'Evento actualizado',
          description: 'Cambió la fecha.',
          href: '/portal/eventos/event-1',
          unread: true,
          createdAt: '2026-11-17T22:00:00.000Z',
        }]}
        resolveHref={href => href}
        onClose={jest.fn()}
        onNavigate={onNavigate}
        onNotificationRead={onNotificationRead}
      />,
    );

    const eventLink = await screen.findByRole('link', { name: 'Ver evento' });
    eventLink.addEventListener('click', event => event.preventDefault(), { once: true });
    fireEvent.click(eventLink);

    expect(onNotificationRead).toHaveBeenCalledWith('notification-1');
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it('permite marcar una notificación persistente como leída', async () => {
    setupBrowser('default');
    const onNotificationRead = jest.fn().mockResolvedValue(undefined);
    render(
      <NotificationCenter
        items={[{
          id: 'notification-1',
          title: 'Evento actualizado',
          description: 'Se cambió el horario.',
          unread: true,
        }]}
        resolveHref={href => href}
        onClose={jest.fn()}
        onNavigate={jest.fn()}
        onNotificationRead={onNotificationRead}
      />,
    );

    expect(await screen.findByText('Evento actualizado')).toBeTruthy();
    expect(screen.getByText('Se cambió el horario.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como leída' }));

    await waitFor(() => expect(onNotificationRead).toHaveBeenCalledWith('notification-1'));
  });

  it('recorre todas las ventanas hasta dejar los avisos activados', async () => {
    const requestPermission = setupBrowser('default');
    renderCenter();

    fireEvent.click(await screen.findByRole('button', { name: 'Configurar avisos' }));
    expect(screen.getByText('Ajustes de notificaciones')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Activar avisos' }));
    expect(screen.getByText('Avisos opcionales')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Solicitar permiso' }));
    expect(screen.getByText('Activar notificaciones')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    await waitFor(() => expect(requestPermission).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(pushSub.savePushSubscription).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Los avisos están activados')).toBeTruthy();
  });

  it('«Ahora no» vuelve a los ajustes sin pedir permiso', async () => {
    const requestPermission = setupBrowser('default');
    renderCenter();

    fireEvent.click(await screen.findByRole('button', { name: 'Configurar avisos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Activar avisos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ahora no' }));

    expect(await screen.findByText('Ajustes de notificaciones')).toBeTruthy();
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('permite desactivar los avisos y elimina la suscripción en la API', async () => {
    setupBrowser('default', true, undefined, fakeSubscription);
    renderCenter();

    fireEvent.click(await screen.findByRole('button', { name: 'Configurar avisos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Activar avisos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar permiso' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    const disableButton = await screen.findByRole('button', { name: 'Desactivar avisos' });
    await waitFor(() => expect(disableButton).toBeEnabled());
    fireEvent.click(disableButton);

    await waitFor(() => expect(pushSub.removePushSubscription).toHaveBeenCalled());
    expect(await screen.findByText('Ajustes de notificaciones')).toBeTruthy();
  });

  it('informa cuando el permiso fue bloqueado', async () => {
    setupBrowser('denied');
    renderCenter();

    fireEvent.click(await screen.findByRole('button', { name: 'Configurar avisos' }));

    expect(await screen.findByText(/bloqueaste las notificaciones/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Activar avisos' })).toBeNull();
  });

  it('avisa cuando el navegador no soporta notificaciones', async () => {
    setupBrowser('default', false);
    renderCenter();

    fireEvent.click(await screen.findByRole('button', { name: 'Configurar avisos' }));

    expect(await screen.findByText(/no admite|requieren una conexión segura/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Activar avisos' })).toBeNull();
  });
});
