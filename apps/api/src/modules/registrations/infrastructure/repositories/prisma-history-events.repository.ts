import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import type { HistoryEventsPort } from '../../application/ports/history-events.port';
import type { CreateHistoryEventInput, HistoryEvent } from '../../domain/entities/history-event';

@Injectable()
export class PrismaHistoryEventsRepository implements HistoryEventsPort {
  constructor(private readonly prisma: PrismaService) {}

  async createEvent(input: CreateHistoryEventInput): Promise<HistoryEvent> {
    return this.prisma.historialEvento.create({
      data: {
        id_solicitud: input.id_solicitud,
        version: input.version,
        tipo_actor: input.tipo_actor,
        actor_id: input.actor_id,
        accion: input.accion,
        detalle: input.detalle,
      },
    });
  }

  async getEventsByApplication(id_solicitud: string): Promise<HistoryEvent[]> {
    return this.prisma.historialEvento.findMany({
      where: { id_solicitud },
      orderBy: { creado_en: 'desc' },
    });
  }
}