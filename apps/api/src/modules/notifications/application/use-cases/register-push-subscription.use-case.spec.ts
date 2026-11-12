import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { PushSubscriptionsRepository } from '../ports/push-subscriptions-repository.port';
import { RegisterPushSubscriptionUseCase } from './register-push-subscription.use-case';
import { UnregisterPushSubscriptionUseCase } from './unregister-push-subscription.use-case';
import { ListPushSubscriptionsUseCase } from './list-push-subscriptions.use-case';

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
  };
}

describe('registro, actualización y eliminación de suscripciones Push (HU13 - T8)', () => {
  it('registra la suscripción para el usuario autenticado', async () => {
    const repository = buildRepository();
    repository.upsert.mockResolvedValue({
      id: 'sub-1',
      userId: actor.id,
      endpoint: 'https://push.example.com/a',
      navegador: 'Chrome',
      plataforma: 'Linux',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-02T00:00:00Z'),
    });

    const useCase = new RegisterPushSubscriptionUseCase(repository);
    const result = await useCase.execute(actor, {
      endpoint: 'https://push.example.com/a',
      p256dh: 'p',
      auth: 'a',
      navegador: 'Chrome',
      plataforma: 'Linux',
    });

    expect(repository.upsert).toHaveBeenCalledWith(actor.id, expect.objectContaining({
      endpoint: 'https://push.example.com/a',
      p256dh: 'p',
      auth: 'a',
    }));
    expect(result).toMatchObject({
      id: 'sub-1',
      userId: actor.id,
      endpoint: 'https://push.example.com/a',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('elimina la suscripción por endpoint para el usuario autenticado', async () => {
    const repository = buildRepository();
    repository.removeByEndpoint.mockResolvedValue(undefined);

    const useCase = new UnregisterPushSubscriptionUseCase(repository);
    await useCase.execute(actor, 'https://push.example.com/a');

    expect(repository.removeByEndpoint).toHaveBeenCalledWith(actor.id, 'https://push.example.com/a');
  });

  it('lista las suscripciones del usuario autenticado', async () => {
    const repository = buildRepository();
    repository.listByUser.mockResolvedValue([
      {
        id: 'sub-1',
        userId: actor.id,
        endpoint: 'https://push.example.com/a',
        navegador: null,
        plataforma: null,
        createdAt: null,
        updatedAt: null,
      },
    ]);

    const useCase = new ListPushSubscriptionsUseCase(repository);
    const result = await useCase.execute(actor);

    expect(repository.listByUser).toHaveBeenCalledWith(actor.id);
    expect(result).toHaveLength(1);
    expect(result[0].endpoint).toBe('https://push.example.com/a');
  });
});
