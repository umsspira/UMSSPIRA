import { ConfigService } from '@nestjs/config';
import webpush from 'web-push';
import type { Environment } from '../../../../config/environment';
import { WebPushAdapter } from './web-push.adapter';

jest.mock('web-push', () => ({
  __esModule: true,
  default: {
    setVapidDetails: jest.fn(),
    sendNotification: jest.fn(),
  },
}));

const mockedWebPush = webpush as jest.Mocked<typeof webpush>;
const subscription = { endpoint: 'https://push.test/endpoint', p256dh: 'key', auth: 'auth' };

describe('WebPushAdapter', () => {
  beforeEach(() => jest.clearAllMocks());

  function adapter(): WebPushAdapter {
    return new WebPushAdapter(new ConfigService<Environment, true>({
      VAPID_SUBJECT: 'mailto:push@umsspira.test',
      VAPID_PUBLIC_KEY: 'public-key',
      VAPID_PRIVATE_KEY: 'private-key',
    }));
  }

  it('configura VAPID y serializa el payload para el proveedor', async () => {
    mockedWebPush.sendNotification.mockResolvedValue({} as never);
    const service = adapter();

    await expect(service.send(subscription, { title: 'Título', body: 'Cuerpo', url: '/portal' })).resolves.toBe('sent');
    expect(mockedWebPush.setVapidDetails).toHaveBeenCalledWith(
      'mailto:push@umsspira.test',
      'public-key',
      'private-key',
    );
    expect(mockedWebPush.sendNotification).toHaveBeenCalledWith(
      { endpoint: subscription.endpoint, keys: { p256dh: 'key', auth: 'auth' } },
      JSON.stringify({ title: 'Título', body: 'Cuerpo', url: '/portal' }),
    );
  });

  it.each([404, 410])('marca HTTP %i como una suscripción inválida', async (statusCode) => {
    mockedWebPush.sendNotification.mockRejectedValue({ statusCode });
    await expect(adapter().send(subscription, { title: 'Título', body: 'Cuerpo' })).resolves.toBe('invalid');
  });
});
