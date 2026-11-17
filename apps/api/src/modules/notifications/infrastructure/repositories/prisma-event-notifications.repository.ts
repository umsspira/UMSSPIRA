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

  async createForUsers(userIds: string[], notification: PushNotificationPayload): Promise<void> {
    if (userIds.length === 0) {
      return;
    }

    await this.prisma.notificacionEvento.createMany({
      data: userIds.map((userId) => ({
        id_usuario: userId,
        id_evento: notification.eventId ?? null,
        titulo: notification.title,
        cuerpo: notification.body,
        url: notification.url ?? null,
      })),
    });
  }

  async listByUser(userId: string): Promise<EventNotificationRecord[]> {
    const records = await this.prisma.notificacionEvento.findMany({
      where: { id_usuario: userId },
      orderBy: { fecha_creacion: 'desc' },
      take: 30,
      select: {
        id: true,
        titulo: true,
        cuerpo: true,
        url: true,
        fecha_creacion: true,
        leida_en: true,
      },
    });

    return records.map((record) => ({
      id: record.id,
      title: record.titulo,
      body: record.cuerpo,
      url: record.url,
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
