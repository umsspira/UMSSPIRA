import { Logger } from '@nestjs/common';
import type { EventsRepository } from '../ports/events-repository.port';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { EventInput } from '../contracts/event-inputs';
import { validateEventDates } from '../../domain/policies/event.policy';
import type { Event } from '../../domain/entities/event';
import type { PushNotifications } from '../../../notifications/application/ports/push-notifications.port';

export class UpdatePublishedEventUseCase {
  private readonly logger = new Logger(UpdatePublishedEventUseCase.name);

  constructor(
    private readonly repository: EventsRepository,
    private readonly notifications: PushNotifications,
  ) {}

  async execute(actor: ActorContext, id: string, input: EventInput) {
    validateEventDates(new Date(input.startDate), new Date(input.endDate));
    const original = await this.repository.findOwned(actor.id, id);
    const updated = await this.repository.updatePublished(actor.id, id, input);
    const changes = importantChanges(original, updated);

    if (original.status === 'PUBLICADO' && changes.length > 0) {
      await this.notifyConfirmedRegistrants(updated, changes);
    }

    return updated;
  }

  private async notifyConfirmedRegistrants(event: Event, changes: string[]): Promise<void> {
    try {
      const userIds = await this.repository.confirmedRegistrantUserIds(event.id);
      if (userIds.length === 0) {
        return;
      }
      const details = changes.length === 1 ? ` Cambió ${changes[0]}.` : ' Cambiaron varios datos importantes.';
      await this.notifications.notify(userIds, {
        title: 'Evento actualizado',
        body: `El evento “${event.title}” fue actualizado.${details}`,
        eventId: event.id,
        url: `/portal/eventos/${event.id}`,
      });
    } catch (error) {
      this.logger.warn(`No se pudo notificar la actualización del evento: ${this.errorMessage(error)}`);
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'error desconocido';
  }
}

function importantChanges(original: Event, updated: Event): string[] {
  const changes: string[] = [];
  if (original.title !== updated.title) {changes.push('el nombre');}
  if (original.startDate.getTime() !== updated.startDate.getTime()) {changes.push('la fecha u horario de inicio');}
  if (original.endDate.getTime() !== updated.endDate.getTime()) {changes.push('la fecha u horario de finalización');}
  if (original.location !== updated.location) {changes.push('la ubicación');}
  if (original.description !== updated.description) {changes.push('la descripción');}
  return changes;
}
