import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import type { PushNotificationPayload } from '../../application/contracts/push-notification';
import type {
  EventNotificationRecord,
  EventNotificationsRepository,
} from '../../application/ports/event-notifications-repository.port';

@Injectable()
export class PrismaEventNotificationsRepository implements EventNotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createForUsers(
    userIds: string[],
    notification: PushNotificationPayload,
    reminderId?: string,
  ): Promise<void> {
    const uniqueUserIds = [...new Set(userIds)];
    if (uniqueUserIds.length === 0) {
      return;
    }

    await this.prisma.notificacionEvento.createMany({
      data: uniqueUserIds.map((userId) => ({
        id_usuario: userId,
        id_evento: notification.eventId ?? null,
        id_recordatorio: reminderId ?? null,
        titulo: notification.title,
        cuerpo: notification.body,
        url: notification.url ?? null,
      })),
      skipDuplicates: true,
    });
  }

  async listByUser(userId: string): Promise<EventNotificationRecord[]> {
    const select = {
      id: true,
      titulo: true,
      cuerpo: true,
      url: true,
      id_recordatorio: true,
      leida_en: true,
      fecha_creacion: true,
    } as const;
    const [notifications, reminders] = await Promise.all([
      this.prisma.notificacionEvento.findMany({
        where: {
          id_usuario: userId,
          id_recordatorio: null,
          OR: [{ url: null }, { url: { not: { contains: '?fromReminder=1' } } }],
        },
        orderBy: { fecha_creacion: 'desc' },
        take: 30,
        select,
      }),
      this.prisma.notificacionEvento.findMany({
        where: {
          id_usuario: userId,
          OR: [
            { id_recordatorio: { not: null } },
            { url: { contains: '?fromReminder=1' } },
          ],
        },
        orderBy: { fecha_creacion: 'desc' },
        take: 30,
        select,
      }),
    ]);

    return [...notifications, ...reminders]
      .sort((a, b) => b.fecha_creacion.getTime() - a.fecha_creacion.getTime())
      .map((record) => ({
        id: record.id,
        title: record.titulo,
        body: record.cuerpo,
        url: record.url,
        isReminder: record.id_recordatorio !== null || (record.url?.includes('?fromReminder=1') ?? false),
        createdAt: record.fecha_creacion,
        readAt: record.leida_en,
      }));
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    await this.prisma.notificacionEvento.updateMany({
      where: { id: notificationId, id_usuario: userId, leida_en: null },
      data: { leida_en: new Date() },
    });
  }
}
