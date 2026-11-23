import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { EventNotificationsRepository } from '../ports/event-notifications-repository.port';
import { ListEventNotificationsUseCase } from './list-event-notifications.use-case';
import { MarkEventNotificationReadUseCase } from './mark-event-notification-read.use-case';

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
});
