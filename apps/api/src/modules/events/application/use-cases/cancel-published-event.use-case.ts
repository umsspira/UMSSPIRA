import { Logger } from '@nestjs/common';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { EventsRepository } from '../ports/events-repository.port';
import type { PushNotifications } from '../../../notifications/application/ports/push-notifications.port';

export class CancelPublishedEventUseCase {
  private readonly logger = new Logger(CancelPublishedEventUseCase.name);

  constructor(
    private readonly repository: EventsRepository,
    private readonly notifications: PushNotifications,
  ) {}

  async execute(actor: ActorContext, id: string) {
    const result = await this.repository.cancelPublished(actor.id, id);
    try {
      const userIds = await this.repository.confirmedRegistrantUserIds(result.event.id);
      if (userIds.length > 0) {
        await this.notifications.notify(userIds, {
          title: 'Evento cancelado',
          body: `El evento “${result.event.title}” fue cancelado. Consulta los detalles para más información.`,
          eventId: result.event.id,
          url: `/portal/eventos/${result.event.id}`,
        });
      }
    } catch (error) {
      this.logger.warn(`No se pudo notificar la cancelación del evento: ${this.errorMessage(error)}`);
    }
    return result;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'error desconocido';
  }
}
