import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { PushNotifications } from '../../../notifications/application/ports/push-notifications.port';
import type { Event } from '../../domain/entities/event';
import type { EventInput } from '../contracts/event-inputs';
import type { EventsRepository } from '../ports/events-repository.port';
import { CancelPublishedEventUseCase } from './cancel-published-event.use-case';
import { UpdatePublishedEventUseCase } from './update-published-event.use-case';

const actor: ActorContext = {
  id: 'owner-1', email: 'owner@umsspira.test', name: 'Owner', role: 'administrador_carrera',
  permissions: ['eventos:manage'], scopes: { companyIds: [], graduateId: null, careerIds: [] }, credentialVersion: 1,
};

const input: EventInput = {
  title: 'Evento original', description: 'Descripción original', startDate: '2026-08-10T10:00:00.000Z',
  endDate: '2026-08-10T12:00:00.000Z', maxCapacity: 100, location: 'Auditorio', coverId: null,
};

function event(overrides: Partial<Event> = {}): Event {
  return {
    id: 'event-1', ownerId: actor.id, title: 'Evento original', description: 'Descripción original',
    startDate: new Date(input.startDate), endDate: new Date(input.endDate), maxCapacity: 100,
    location: 'Auditorio', coverId: null, status: 'PUBLICADO', creatorName: 'Owner',
    createdAt: new Date('2026-01-01T00:00:00.000Z'), ...overrides,
  };
}

function repository(): jest.Mocked<EventsRepository> {
  return {
    findOwned: jest.fn(), updatePublished: jest.fn(), confirmedRegistrantUserIds: jest.fn(),
  } as unknown as jest.Mocked<EventsRepository>;
}

function notifications(): jest.Mocked<PushNotifications> {
  return { notify: jest.fn().mockResolvedValue({ sent: 1, failed: 0, invalidEndpoints: 0 }) };
}

describe('notificaciones Push de eventos publicados', () => {
  it.each([
    ['nombre', { title: 'Nombre actualizado' }],
    ['fecha', { startDate: new Date('2026-08-11T10:00:00.000Z') }],
    ['horario', { endDate: new Date('2026-08-10T13:00:00.000Z') }],
    ['ubicación', { location: 'Sala magna' }],
    ['descripción', { description: 'Descripción actualizada' }],
  ])('notifica cuando cambia el %s', async (_change, overrides) => {
    const events = repository();
    const push = notifications();
    events.findOwned.mockResolvedValue(event());
    events.updatePublished.mockResolvedValue(event(overrides));
    events.confirmedRegistrantUserIds.mockResolvedValue(['graduate-1']);

    await new UpdatePublishedEventUseCase(events, push).execute(actor, 'event-1', input);

    expect(push.notify).toHaveBeenCalledWith(
      ['graduate-1'],
      expect.objectContaining({ eventId: 'event-1', url: '/portal/eventos/event-1' }),
    );
  });

  it('no notifica por cambios exclusivos de cupo, portada ni valores iguales', async () => {
    const events = repository();
    const push = notifications();
    events.findOwned.mockResolvedValue(event());
    events.updatePublished.mockResolvedValue(event({ maxCapacity: 150, coverId: 'cover-2' }));

    await new UpdatePublishedEventUseCase(events, push).execute(actor, 'event-1', input);

    expect(events.confirmedRegistrantUserIds).not.toHaveBeenCalled();
    expect(push.notify).not.toHaveBeenCalled();
  });

  it('no notifica eventos que no eran publicados ni si no hay destinatarios', async () => {
    const events = repository();
    const push = notifications();
    events.findOwned.mockResolvedValue(event({ status: 'BORRADOR' }));
    events.updatePublished.mockResolvedValue(event({ status: 'PUBLICADO', title: 'Publicado' }));

    await new UpdatePublishedEventUseCase(events, push).execute(actor, 'event-1', input);

    expect(push.notify).not.toHaveBeenCalled();
  });

  it('notifica cancelaciones después de persistir y no revierte ante un error Push', async () => {
    const events = repository();
    const push = notifications();
    events.cancelPublished.mockResolvedValue({ event: event({ status: 'CANCELADO' }), registrationsCount: 2, invalidatedPassesCount: 2 });
    events.confirmedRegistrantUserIds.mockResolvedValue(['graduate-1']);
    push.notify.mockRejectedValue(new Error('Proveedor no disponible'));

    await expect(new CancelPublishedEventUseCase(events, push).execute(actor, 'event-1')).resolves.toMatchObject({
      invalidatedPassesCount: 2,
    });
    expect(push.notify).toHaveBeenCalledWith(['graduate-1'], expect.objectContaining({ title: 'Evento cancelado' }));
  });

  it('no consulta destinatarios si la cancelación falla', async () => {
    const events = repository();
    const push = notifications();
    events.cancelPublished.mockRejectedValue(new Error('El evento ya no está publicado'));

    await expect(new CancelPublishedEventUseCase(events, push).execute(actor, 'event-1')).rejects.toThrow('ya no está publicado');
    expect(events.confirmedRegistrantUserIds).not.toHaveBeenCalled();
  });
});
