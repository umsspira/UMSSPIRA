import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { validateEventDates } from '../../domain/policies/event.policy';
import { updateEventSchema } from '../../http/schemas/events.schemas';
import { toEvent } from '../translators/event.translator';

@Injectable()
export class ScheduledEventPublicationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScheduledEventPublicationWorker.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.run();
    }, 30_000);

    void this.run();
  }

  onModuleDestroy(): void {
    if (this.timer) {clearInterval(this.timer);}
  }

  private async run(): Promise<void> {
    if (this.running) {return;}
    this.running = true;

    try {
      for (let count = 0; count < 20; count += 1) {
        const processed = await this.publishNext();
        if (!processed) {break;}
      }
    } catch (error) {
      this.logger.error('No se pudieron procesar los eventos programados', error);
    } finally {
      this.running = false;
    }
  }

  private async publishNext(): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM evento
        WHERE estado = 'BORRADOR'
          AND archivado = false
          AND estado_programacion = 'PENDIENTE'
          AND fecha_publicacion_programada <= CURRENT_TIMESTAMP
        ORDER BY fecha_publicacion_programada, id
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      `;

      if (rows.length === 0) {return false;}

      const row = await tx.evento.findUniqueOrThrow({
        where: { id: rows[0].id },
      });

      let valid = false;
      try {
        const event = toEvent(row);
        validateEventDates(event.startDate, event.endDate);

        valid = updateEventSchema.safeParse({
          title: event.title,
          description: event.description ?? undefined,
          startDate: event.startDate.toISOString(),
          endDate: event.endDate.toISOString(),
          maxCapacity: event.maxCapacity,
          location: event.location ?? undefined,
          imageUrl: event.coverId
            ? '/api/v1/events/covers/' + event.coverId
            : null,
        }).success;
      } catch {
        valid = false;
      }

      await tx.evento.update({
        where: { id: row.id },
        data: valid
          ? {
              estado: 'PUBLICADO',
              fecha_publicacion_programada: null,
              estado_programacion: null,
            }
          : { estado_programacion: 'FALLIDA' },
      });

      return true;
    }, { timeout: 15000 });
  }
}
