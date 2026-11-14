import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { PushSubscriptionsRepository } from '../../application/ports/push-subscriptions-repository.port';
import { RegisterPushSubscriptionUseCase } from '../../application/use-cases/register-push-subscription.use-case';
import { UnregisterPushSubscriptionUseCase } from '../../application/use-cases/unregister-push-subscription.use-case';
import { ListPushSubscriptionsUseCase } from '../../application/use-cases/list-push-subscriptions.use-case';
import { RegisterPushSubscriptionController } from './register-push-subscription.controller';
import { UnregisterPushSubscriptionController } from './unregister-push-subscription.controller';
import { ListPushSubscriptionsController } from './list-push-subscriptions.controller';

const actor: ActorContext = {
  id: 'titulado-1',
  email: 'titulado@umsspira.test',
  name: 'Titulado',
  role: 'titulado',
  permissions: [],
  scopes: { companyIds: [], graduateId: 'grad-1', careerIds: [] },
  credentialVersion: 1,
};

function buildRepository(): jest.Mocked<PushSubscriptionsRepository> {
  return {
    upsert: jest.fn(),
    removeByEndpoint: jest.fn(),
    listByUser: jest.fn(),
    listForUsers: jest.fn(),
    removeInvalidEndpoint: jest.fn(),
  };
}

describe('Push Subscriptions Controllers (HU13 - T8)', () => {
  it('registra una nueva suscripción mediante RegisterPushSubscriptionController', async () => {
    const repository = buildRepository();
    repository.upsert.mockResolvedValue({
      id: 'sub-1',
      userId: actor.id,
      endpoint: 'https://push.example.com/xyz',
      navegador: 'Chrome',
      plataforma: 'Linux',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-02T00:00:00Z'),
    });

    const useCase = new RegisterPushSubscriptionUseCase(repository);
    const controller = new RegisterPushSubscriptionController(useCase);

    const body = {
      endpoint: 'https://push.example.com/xyz',
      keys: { p256dh: 'p256dhKey', auth: 'authSecret' },
      navegador: 'Chrome',
      plataforma: 'Linux',
    };

    const response = await controller.handle(actor, body);
    expect(response.data.id).toBe('sub-1');
    expect(response.data.endpoint).toBe('https://push.example.com/xyz');
    expect(repository.upsert).toHaveBeenCalledWith(actor.id, expect.objectContaining({
      endpoint: 'https://push.example.com/xyz',
      p256dh: 'p256dhKey',
      auth: 'authSecret',
    }));
  });

  it('elimina la suscripción por endpoint mediante UnregisterPushSubscriptionController', async () => {
    const repository = buildRepository();
    repository.removeByEndpoint.mockResolvedValue(undefined);

    const useCase = new UnregisterPushSubscriptionUseCase(repository);
    const controller = new UnregisterPushSubscriptionController(useCase);

    await controller.handle(actor, { endpoint: 'https://push.example.com/xyz' });
    expect(repository.removeByEndpoint).toHaveBeenCalledWith(actor.id, 'https://push.example.com/xyz');
  });

  it('lista las suscripciones del usuario mediante ListPushSubscriptionsController', async () => {
    const repository = buildRepository();
    repository.listByUser.mockResolvedValue([
      {
        id: 'sub-1',
        userId: actor.id,
        endpoint: 'https://push.example.com/xyz',
        navegador: 'Chrome',
        plataforma: 'Linux',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: null,
      },
    ]);

    const useCase = new ListPushSubscriptionsUseCase(repository);
    const controller = new ListPushSubscriptionsController(useCase);

    const response = await controller.handle(actor);
    expect(response.data).toHaveLength(1);
    expect(response.data[0].id).toBe('sub-1');
    expect(response.data[0].endpoint).toBe('https://push.example.com/xyz');
  });
});
