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

  it('separates reminders from other notifications, including older reminders without an id', async () => {
    const createdAt = new Date('2026-11-17T22:00:00.000Z');
    const findMany = jest.fn()
      .mockResolvedValueOnce([{
        id: 'notification-1',
        titulo: 'Evento actualizado',
        cuerpo: 'Se cambió el horario.',
        url: '/portal/eventos/event-1',
        id_recordatorio: null,
        leida_en: null,
        fecha_creacion: createdAt,
      }])
      .mockResolvedValueOnce([{
        id: 'reminder-1',
        titulo: 'Recordatorio',
        cuerpo: 'El evento empieza pronto.',
        url: '/portal/eventos/event-1?fromReminder=1',
        id_recordatorio: null,
        leida_en: null,
        fecha_creacion: new Date('2026-11-18T22:00:00.000Z'),
      }, {
        id: 'reminder-2',
        titulo: 'Recordatorio nuevo',
        cuerpo: 'El evento empieza pronto.',
        url: null,
        id_recordatorio: 'reminder-id',
        leida_en: null,
        fecha_creacion: new Date('2026-11-17T23:00:00.000Z'),
      }]);
    const repository = new PrismaEventNotificationsRepository({
      notificacionEvento: { findMany },
    } as unknown as PrismaService);

    await expect(repository.listByUser('user-1')).resolves.toEqual([{
      id: 'reminder-1',
      title: 'Recordatorio',
      body: 'El evento empieza pronto.',
      url: '/portal/eventos/event-1?fromReminder=1',
      isReminder: true,
      readAt: null,
      createdAt: new Date('2026-11-18T22:00:00.000Z'),
    }, {
      id: 'reminder-2',
      title: 'Recordatorio nuevo',
      body: 'El evento empieza pronto.',
      url: null,
      isReminder: true,
      readAt: null,
      createdAt: new Date('2026-11-17T23:00:00.000Z'),
    }, {
      id: 'notification-1',
      title: 'Evento actualizado',
      body: 'Se cambió el horario.',
      url: '/portal/eventos/event-1',
      isReminder: false,
      readAt: null,
      createdAt,
    }]);
    expect(findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: {
        id_usuario: 'user-1',
        id_recordatorio: null,
        OR: [{ url: null }, { url: { not: { contains: '?fromReminder=1' } } }],
      },
      take: 30,
      orderBy: { fecha_creacion: 'desc' },
    }));
    expect(findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: {
        id_usuario: 'user-1',
        OR: [
          { id_recordatorio: { not: null } },
          { url: { contains: '?fromReminder=1' } },
        ],
      },
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
