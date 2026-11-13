import { PushNotificationService } from './push-notification.service';
import type { PushSender } from '../ports/push-sender.port';
import type { PushSubscriptionsRepository } from '../ports/push-subscriptions-repository.port';

function repository(): jest.Mocked<PushSubscriptionsRepository> {
  return {
    upsert: jest.fn(),
    removeByEndpoint: jest.fn(),
    listByUser: jest.fn(),
    listForUsers: jest.fn(),
    removeInvalidEndpoint: jest.fn(),
  };
}

describe('PushNotificationService', () => {
  const notification = { title: 'Evento actualizado', body: 'El evento cambió.', url: '/portal/eventos/1' };

  it('envía una vez cada endpoint y reporta entregas correctas', async () => {
    const subscriptions = repository();
    subscriptions.listForUsers.mockResolvedValue([
      { endpoint: 'https://push.test/one', p256dh: 'key-1', auth: 'auth-1' },
      { endpoint: 'https://push.test/one', p256dh: 'key-1', auth: 'auth-1' },
    ]);
    const sender: jest.Mocked<PushSender> = { send: jest.fn().mockResolvedValue('sent') };
    const service = new PushNotificationService(subscriptions, sender);

    await expect(service.notify(['user-1'], notification)).resolves.toEqual({
      sent: 1,
      failed: 0,
      invalidEndpoints: 0,
    });
    expect(sender.send).toHaveBeenCalledTimes(1);
  });

  it.each(['invalid'] as const)('limpia únicamente el endpoint cuando el proveedor lo marca %s', async (result) => {
    const subscriptions = repository();
    subscriptions.listForUsers.mockResolvedValue([
      { endpoint: 'https://push.test/expired', p256dh: 'key', auth: 'auth' },
    ]);
    const sender: jest.Mocked<PushSender> = { send: jest.fn().mockResolvedValue(result) };
    const service = new PushNotificationService(subscriptions, sender);

    await service.notify(['user-1'], notification);
    expect(subscriptions.removeInvalidEndpoint).toHaveBeenCalledWith('https://push.test/expired');
  });

  it('continúa con las demás suscripciones cuando una entrega falla', async () => {
    const subscriptions = repository();
    subscriptions.listForUsers.mockResolvedValue([
      { endpoint: 'https://push.test/failing', p256dh: 'key-1', auth: 'auth-1' },
      { endpoint: 'https://push.test/working', p256dh: 'key-2', auth: 'auth-2' },
    ]);
    const sender: jest.Mocked<PushSender> = {
      send: jest.fn().mockResolvedValueOnce('failed').mockResolvedValueOnce('sent'),
    };
    const service = new PushNotificationService(subscriptions, sender);

    await expect(service.notify(['user-1'], notification)).resolves.toEqual({
      sent: 1,
      failed: 1,
      invalidEndpoints: 0,
    });
  });
});
