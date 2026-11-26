import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { PrismaEventNotificationsRepository } from './prisma-event-notifications.repository';

describe('PrismaEventNotificationsRepository', () => {
  it('creates one persistent card per user and skips duplicate reminder deliveries', async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 2 });
    const repository = new PrismaEventNotificationsRepository({
      notificacionEvento: { createMany },
    } as unknown as PrismaService);

    await repository.createForUsers(
      ['user-1', 'user-1', 'user-2'],
      { title: 'Recordatorio', body: 'El evento empieza pronto.', eventId: 'event-1' },
      'reminder-1',
    );

    expect(createMany).toHaveBeenCalledWith({
      data: [
        {
          id_usuario: 'user-1',
          id_evento: 'event-1',
          id_recordatorio: 'reminder-1',
          titulo: 'Recordatorio',
          cuerpo: 'El evento empieza pronto.',
          url: null,
        },
        {
          id_usuario: 'user-2',
          id_evento: 'event-1',
          id_recordatorio: 'reminder-1',
          titulo: 'Recordatorio',
          cuerpo: 'El evento empieza pronto.',
          url: null,
        },
      ],
      skipDuplicates: true,
    });
  });

  it('lists only the user’s newest notifications and maps database fields', async () => {
    const createdAt = new Date('2026-11-17T22:00:00.000Z');
    const findMany = jest.fn().mockResolvedValue([{
      id: 'notification-1',
      titulo: 'Evento actualizado',
      cuerpo: 'Se cambió el horario.',
      url: '/portal/eventos/event-1',
      leida_en: null,
      fecha_creacion: createdAt,
    }]);
    const repository = new PrismaEventNotificationsRepository({
      notificacionEvento: { findMany },
    } as unknown as PrismaService);

    await expect(repository.listByUser('user-1')).resolves.toEqual([{
      id: 'notification-1',
      title: 'Evento actualizado',
      body: 'Se cambió el horario.',
      url: '/portal/eventos/event-1',
      readAt: null,
      createdAt,
    }]);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id_usuario: 'user-1' },
      take: 30,
      orderBy: { fecha_creacion: 'desc' },
    }));
  });

  it('marks a notification read only for its owner', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const repository = new PrismaEventNotificationsRepository({
      notificacionEvento: { updateMany },
    } as unknown as PrismaService);

    await repository.markRead('user-1', 'notification-1');

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 'notification-1',
        id_usuario: 'user-1',
        leida_en: null,
      },
      data: { leida_en: expect.any(Date) },
    });
  });
});
