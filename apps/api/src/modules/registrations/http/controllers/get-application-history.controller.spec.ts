import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { GetApplicationHistoryController } from './get-application-history.controller';

describe('GetApplicationHistoryController', () => {
  const actor = { id: 'admin-id' } as ActorContext;
  const createdAt = new Date('2026-11-15T12:00:00.000Z');
  const getApplication = { execute: jest.fn() };
  const historyEvents = { getHistory: jest.fn() };
  const controller = new GetApplicationHistoryController(
    getApplication as never,
    historyEvents as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('valida el acceso al expediente y serializa los eventos', async () => {
    getApplication.execute.mockResolvedValue({});
    historyEvents.getHistory.mockResolvedValue([
      {
        id: 'event-id',
        version: 2,
        tipo_actor: 'ADMINISTRADOR',
        actor_id: 'admin-id',
        accion: 'DICTAMEN',
        detalle: 'Decisión administrativa: OBSERVADA.',
        creado_en: createdAt,
      },
    ]);

    await expect(controller.handle(actor, 'application-id')).resolves.toEqual({
      data: [
        {
          id: 'event-id',
          version: 2,
          actorType: 'ADMINISTRADOR',
          action: 'DICTAMEN',
          detail: 'Decisión administrativa: OBSERVADA.',
          createdAt: createdAt.toISOString(),
        },
      ],
    });
    expect(getApplication.execute).toHaveBeenCalledWith(actor, 'application-id');
    expect(historyEvents.getHistory).toHaveBeenCalledWith('application-id');
  });

  it('no consulta eventos cuando el actor no tiene acceso al expediente', async () => {
    getApplication.execute.mockRejectedValue(new Error('forbidden'));

    await expect(controller.handle(actor, 'application-id')).rejects.toThrow('forbidden');
    expect(historyEvents.getHistory).not.toHaveBeenCalled();
  });
});
