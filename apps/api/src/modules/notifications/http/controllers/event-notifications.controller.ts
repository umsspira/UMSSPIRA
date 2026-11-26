import { Controller, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { CurrentActor } from '../../../../shared/http/auth/decorators/current-actor.decorator';
import { Roles } from '../../../../shared/http/auth/decorators/roles.decorator';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { ListEventNotificationsUseCase } from '../../application/use-cases/list-event-notifications.use-case';
import { MarkEventNotificationReadUseCase } from '../../application/use-cases/mark-event-notification-read.use-case';

@Controller('event-notifications')
@Roles('titulado')
export class EventNotificationsController {
  constructor(
    private readonly listNotifications: ListEventNotificationsUseCase,
    private readonly markNotificationRead: MarkEventNotificationReadUseCase,
  ) {}

  @Get()
  async list(@CurrentActor() actor: ActorContext) {
    const records = await this.listNotifications.execute(actor);
    return {
      data: records.map((record) => ({
        id: record.id,
        title: record.title,
        description: record.body,
        href: record.url ?? undefined,
        unread: record.readAt === null,
        createdAt: record.createdAt,
      })),
    };
  }

  @Patch(':id/read')
  async markRead(
    @CurrentActor() actor: ActorContext,
    @Param('id', new ParseUUIDPipe()) notificationId: string,
  ) {
    await this.markNotificationRead.execute(actor, notificationId);
    return { data: { id: notificationId, unread: false } };
  }
}
