import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import type {
  PushSubscriptionsRepository,
} from '../../application/ports/push-subscriptions-repository.port';
import type {
  RegisterPushSubscriptionInput,
  PushDeliverySubscription,
  StoredPushSubscription,
} from '../../domain/entities/push-subscription';

type DispositivoRow = {
  id: string;
  usuario_id: string | null;
  url_push: string | null;
  navegador: string | null;
  plataforma: string | null;
  fecha_creacion: Date | null;
  fecha_actualizacion: Date | null;
};

/**
 * Persiste suscripciones Push en la tabla `dispositivo` (HU13 - T8).
 * Mapeo de columnas:
 *  - url_push         -> endpoint de la suscripción
 *  - llave_publica    -> clave p256dh
 *  - llave_secreta    -> secreto auth
 */
@Injectable()
export class PrismaPushSubscriptionsRepository
  implements PushSubscriptionsRepository
{
  constructor(private readonly prisma: PrismaService) {}

  private toModel(row: DispositivoRow): StoredPushSubscription {
    return {
      id: row.id,
      userId: row.usuario_id ?? '',
      endpoint: row.url_push ?? '',
      navegador: row.navegador,
      plataforma: row.plataforma,
      createdAt: row.fecha_creacion,
      updatedAt: row.fecha_actualizacion,
    };
  }

  async upsert(
    userId: string,
    input: RegisterPushSubscriptionInput,
  ): Promise<StoredPushSubscription> {
    const now = new Date();
    const existing = await this.prisma.dispositivo.findFirst({
      where: { usuario_id: userId, url_push: input.endpoint },
      select: { id: true },
    });

    const data = {
      url_push: input.endpoint,
      llave_publica: input.p256dh,
      llave_secreta: input.auth,
      navegador: input.navegador ?? null,
      plataforma: input.plataforma ?? null,
      fecha_actualizacion: now,
    };

    const row = existing
      ? await this.prisma.dispositivo.update({
          where: { id: existing.id },
          data,
          select: {
            id: true,
            usuario_id: true,
            url_push: true,
            navegador: true,
            plataforma: true,
            fecha_creacion: true,
            fecha_actualizacion: true,
          },
        })
      : await this.prisma.dispositivo.create({
          data: {
            ...data,
            usuario_id: userId,
            fecha_creacion: now,
          },
          select: {
            id: true,
            usuario_id: true,
            url_push: true,
            navegador: true,
            plataforma: true,
            fecha_creacion: true,
            fecha_actualizacion: true,
          },
        });

    return this.toModel(row);
  }

  async removeByEndpoint(userId: string, endpoint: string): Promise<void> {
    await this.prisma.dispositivo.deleteMany({
      where: { usuario_id: userId, url_push: endpoint },
    });
  }

  async listByUser(userId: string): Promise<StoredPushSubscription[]> {
    const rows = await this.prisma.dispositivo.findMany({
      where: { usuario_id: userId },
      select: {
        id: true,
        usuario_id: true,
        url_push: true,
        navegador: true,
        plataforma: true,
        fecha_creacion: true,
        fecha_actualizacion: true,
      },
      orderBy: { fecha_actualizacion: 'desc' },
    });

    return rows.map((row) => this.toModel(row));
  }

  async listForUsers(userIds: string[]): Promise<PushDeliverySubscription[]> {
    if (userIds.length === 0) {
      return [];
    }

    const rows = await this.prisma.dispositivo.findMany({
      where: {
        usuario_id: { in: userIds },
        url_push: { not: null },
        llave_publica: { not: null },
        llave_secreta: { not: null },
      },
      select: {
        url_push: true,
        llave_publica: true,
        llave_secreta: true,
      },
    });

    return rows.flatMap((row) => {
      if (!row.url_push || !row.llave_publica || !row.llave_secreta) {
        return [];
      }
      return [{ endpoint: row.url_push, p256dh: row.llave_publica, auth: row.llave_secreta }];
    });
  }

  async removeInvalidEndpoint(endpoint: string): Promise<void> {
    await this.prisma.dispositivo.deleteMany({ where: { url_push: endpoint } });
  }
}
