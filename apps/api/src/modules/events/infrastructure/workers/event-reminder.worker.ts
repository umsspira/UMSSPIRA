import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { PushNotificationService } from '../../../notifications/application/services/push-notification.service';

const REMINDER_LEASE_MINUTES = 5;

@Injectable()
export class EventReminderWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventReminderWorker.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushNotifications: PushNotificationService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.run();
    }, 30_000);
    void this.run();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async run(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;

    try {
      await this.reconcileSchedules();
      for (let count = 0; count < 20; count += 1) {
        const reminderId = await this.claimNext();
        if (!reminderId) {
          break;
        }
        await this.sendReminder(reminderId);
      }
    } catch (error) {
      this.logger.error('No se pudieron procesar los recordatorios de eventos', error);
    } finally {
      this.running = false;
    }
  }

  private async reconcileSchedules(): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE recordatorio_evento r
        SET programado_para =
              e.fecha_inicio - make_interval(hours => c.anticipacion_horas),
            reprogramado = true,
            estado = 'PENDIENTE',
            error = NULL,
            reintentar_en = NULL,
            procesando_desde = NULL
        FROM evento e
        CROSS JOIN configuracion_recordatorios c
        WHERE r.id_evento = e.id
          AND c.id = 1
          AND r.estado IN ('PENDIENTE', 'FALLIDO', 'OMITIDO')
          AND e.estado = 'PUBLICADO'
          AND e.archivado = false
          AND e.fecha_inicio > CURRENT_TIMESTAMP
          AND EXISTS (
            SELECT 1
            FROM inscripcion_evento i
            WHERE i.id = r.id_inscripcion
              AND i.estado = 'CONFIRMADA'
          )
          AND r.programado_para <> e.fecha_inicio
                - make_interval(hours => c.anticipacion_horas)
      `;

      await tx.$executeRaw`
        INSERT INTO recordatorio_evento (id_inscripcion, id_evento, programado_para)
        SELECT i.id,
               e.id,
               e.fecha_inicio
                 - make_interval(hours => c.anticipacion_horas)
        FROM inscripcion_evento i
        JOIN evento e ON e.id = i.id_evento
        CROSS JOIN configuracion_recordatorios c
        WHERE i.estado = 'CONFIRMADA'
          AND i.id_usuario IS NOT NULL
          AND c.id = 1
          AND e.estado = 'PUBLICADO'
          AND e.archivado = false
          AND e.fecha_inicio > CURRENT_TIMESTAMP
          AND e.fecha_fin > CURRENT_TIMESTAMP
          AND NOT EXISTS (
            SELECT 1
            FROM recordatorio_evento r
            WHERE r.id_inscripcion = i.id
              AND r.estado IN ('PENDIENTE', 'FALLIDO', 'EN_PROCESO', 'ENVIADO', 'SIN_SUSCRIPCION')
          )
        ON CONFLICT (id_inscripcion, programado_para) DO NOTHING
      `;
    }, { timeout: 15000 });
  }

  private async claimNext(): Promise<string | null> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM recordatorio_evento
        WHERE (
          estado IN ('PENDIENTE', 'FALLIDO')
          AND programado_para <= CURRENT_TIMESTAMP
          AND (reintentar_en IS NULL OR reintentar_en <= CURRENT_TIMESTAMP)
        ) OR (
          estado = 'EN_PROCESO'
          AND procesando_desde <= CURRENT_TIMESTAMP - (${REMINDER_LEASE_MINUTES} * INTERVAL '1 minute')
        )
        ORDER BY programado_para, id
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      `;
      const id = rows[0]?.id;
      if (!id) {
        return null;
      }

      await tx.recordatorioEvento.update({
        where: { id },
        data: {
          estado: 'EN_PROCESO',
          intentos: { increment: 1 },
          procesando_desde: new Date(),
          reintentar_en: null,
        },
      });
      return id;
    }, { timeout: 15000 });
  }

  private async sendReminder(reminderId: string): Promise<void> {
    const now = new Date();
    const reminder = await this.prisma.recordatorioEvento.findUnique({
      where: { id: reminderId },
      include: {
        inscripcion: { select: { id_usuario: true, estado: true } },
        evento: {
          select: {
            id: true,
            titulo: true,
            fecha_inicio: true,
            fecha_fin: true,
            ubicacion: true,
            estado: true,
            archivado: true,
          },
        },
      },
    });

    if (!reminder) {
      return;
    }
    const event = reminder.evento;
    const registration = reminder.inscripcion;
    if (
      registration.estado !== 'CONFIRMADA'
      || !registration.id_usuario
      || event.estado !== 'PUBLICADO'
      || event.archivado
      || !event.fecha_inicio
      || event.fecha_inicio <= now
      || !event.fecha_fin
      || event.fecha_fin <= now
    ) {
      await this.finishWithoutDelivery(reminderId, 'OMITIDO');
      return;
    }

    const settings = await this.prisma.configuracionRecordatorios.findUniqueOrThrow({
      where: { id: 1 },
      select: { anticipacion_horas: true },
    });
    const desiredTime = new Date(
      event.fecha_inicio.getTime() - settings.anticipacion_horas * 60 * 60 * 1000,
    );
    if (desiredTime.getTime() !== reminder.programado_para.getTime()) {
      await this.prisma.recordatorioEvento.update({
        where: { id: reminderId },
        data: {
          programado_para: desiredTime,
          reprogramado: true,
          estado: 'PENDIENTE',
          error: null,
          reintentar_en: null,
          procesando_desde: null,
        },
      });
      return;
    }

    const completedDeliveries = await this.prisma.recordatorioEntrega.findMany({
      where: { id_recordatorio: reminderId, estado: 'ENVIADO' },
      select: { id_dispositivo: true },
    });
    const completedDeviceIds = new Set(completedDeliveries.map((item) => item.id_dispositivo));
    const eventName = event.titulo?.trim();
    if (!eventName) {
      await this.finishWithoutDelivery(reminderId, 'OMITIDO');
      return;
    }

    const location = event.ubicacion
      ? `Ubicación: ${event.ubicacion}`
      : 'Consulta los detalles del evento.';
    const deliveries = await this.pushNotifications.notifyWithResults(
      [registration.id_usuario],
      {
        title: `Recordatorio: ${eventName}`,
        body: `${formatReminderDateTime(event.fecha_inicio)} · ${location}`,
        url: `/portal/eventos/${event.id}?fromReminder=1${reminder.reprogramado ? '&rescheduled=1' : ''}`,
        eventId: event.id,
      },
      completedDeviceIds,
      async (delivery) => {
        if (delivery.outcome === 'invalid') {
          return;
        }
        await this.prisma.recordatorioEntrega.upsert({
          where: {
            id_recordatorio_id_dispositivo: {
              id_recordatorio: reminderId,
              id_dispositivo: delivery.deviceId,
            },
          },
          create: {
            id_recordatorio: reminderId,
            id_dispositivo: delivery.deviceId,
            estado: delivery.outcome === 'sent' ? 'ENVIADO' : 'FALLIDO',
            intentos: 1,
            error: delivery.error ?? null,
            enviado_en: delivery.outcome === 'sent' ? new Date() : null,
          },
          update: {
            estado: delivery.outcome === 'sent' ? 'ENVIADO' : 'FALLIDO',
            intentos: { increment: 1 },
            error: delivery.error ?? null,
            enviado_en: delivery.outcome === 'sent' ? new Date() : null,
          },
        });
      },
      reminderId,
    );

    const failed = deliveries.filter((delivery) => delivery.outcome === 'failed');
    const sent = deliveries.filter((delivery) => delivery.outcome === 'sent').length
      + completedDeviceIds.size;
    if (failed.length > 0) {
      const retryMinutes = Math.min(60, 5 * (2 ** Math.min(reminder.intentos - 1, 4)));
      await this.prisma.recordatorioEvento.update({
        where: { id: reminderId },
        data: {
          estado: 'FALLIDO',
          error: failed.map((delivery) => delivery.error ?? 'Fallo de entrega').join('; '),
          reintentar_en: new Date(Date.now() + retryMinutes * 60 * 1000),
          procesando_desde: null,
        },
      });
      return;
    }

    await this.prisma.recordatorioEvento.update({
      where: { id: reminderId },
      data: {
        estado: sent > 0 ? 'ENVIADO' : 'SIN_SUSCRIPCION',
        enviado_en: sent > 0 ? new Date() : null,
        error: null,
        reintentar_en: null,
        procesando_desde: null,
      },
    });
  }

  private async finishWithoutDelivery(
    reminderId: string,
    state: 'OMITIDO',
  ): Promise<void> {
    await this.prisma.recordatorioEvento.update({
      where: { id: reminderId },
      data: {
        estado: state,
        error: null,
        reintentar_en: null,
        procesando_desde: null,
      },
    });
  }
}

function formatReminderDateTime(value: Date): string {
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'America/La_Paz',
  }).format(value);
}
