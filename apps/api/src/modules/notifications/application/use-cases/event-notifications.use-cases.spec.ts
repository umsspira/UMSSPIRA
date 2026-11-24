import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { EventNotificationsRepository } from '../ports/event-notifications-repository.port';
import { ListEventNotificationsUseCase } from './list-event-notifications.use-case';
import { MarkEventNotificationReadUseCase } from './mark-event-notification-read.use-case';
import { EventNotificationsController } from '../../http/controllers/event-notifications.controller';

const actor = { id: 'graduate-1' } as ActorContext;

function repository(): jest.Mocked<EventNotificationsRepository> {
  return {
    createForUsers: jest.fn(),
    listByUser: jest.fn().mockResolvedValue([]),
    markRead: jest.fn().mockResolvedValue(undefined),
  };
}

describe('event notification use cases', () => {
  it('lists only the current actor notifications', async () => {
    const notifications = repository();
    const useCase = new ListEventNotificationsUseCase(notifications);

    await useCase.execute(actor);

    expect(notifications.listByUser).toHaveBeenCalledWith(actor.id);
  });

  it('marks a notification read only for the current actor', async () => {
    const notifications = repository();
    const useCase = new MarkEventNotificationReadUseCase(notifications);

    await useCase.execute(actor, 'notification-1');

    expect(notifications.markRead).toHaveBeenCalledWith(actor.id, 'notification-1');
  });

  it('exposes reminder classification to the notification client', async () => {
    const notifications = repository();
    const createdAt = new Date('2026-11-17T22:00:00.000Z');
    notifications.listByUser.mockResolvedValue([{
      id: 'reminder-1',
      title: 'Recordatorio',
      body: 'El evento empieza pronto.',
      url: '/portal/eventos/event-1',
      isReminder: true,
      createdAt,
      readAt: null,
    }]);
    const controller = new EventNotificationsController(
      new ListEventNotificationsUseCase(notifications),
      new MarkEventNotificationReadUseCase(notifications),
    );

    await expect(controller.list(actor)).resolves.toEqual({
      data: [{
        id: 'reminder-1',
        title: 'Recordatorio',
        description: 'El evento empieza pronto.',
        href: '/portal/eventos/event-1',
        isReminder: true,
        unread: true,
        createdAt,
      }],
    });
  });
});
