import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';

const SETTINGS_ID = 1;

@Injectable()
export class EventReminderSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const settings = await this.prisma.configuracionRecordatorios.findUniqueOrThrow({
      where: { id: SETTINGS_ID },
      select: { anticipacion_horas: true },
    });
    return { anticipationHours: settings.anticipacion_horas };
  }

  async update(anticipationHours: number) {
    const settings = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.configuracionRecordatorios.upsert({
        where: { id: SETTINGS_ID },
        create: { id: SETTINGS_ID, anticipacion_horas: anticipationHours },
        update: { anticipacion_horas: anticipationHours },
        select: { anticipacion_horas: true },
      });

      await tx.$executeRaw`
        UPDATE recordatorio_evento r
        SET programado_para = e.fecha_inicio
              - make_interval(hours => ${anticipationHours}::integer),
            reprogramado = true,
            estado = 'PENDIENTE',
            error = NULL,
            reintentar_en = NULL,
            procesando_desde = NULL
        FROM evento e
        WHERE r.id_evento = e.id
          AND r.estado IN ('PENDIENTE', 'FALLIDO', 'EN_PROCESO', 'OMITIDO')
          AND e.estado = 'PUBLICADO'
          AND e.archivado = false
          AND e.fecha_inicio > CURRENT_TIMESTAMP
          AND e.fecha_fin > CURRENT_TIMESTAMP
          AND r.programado_para <> e.fecha_inicio
                - make_interval(hours => ${anticipationHours}::integer)
          AND EXISTS (
            SELECT 1
            FROM inscripcion_evento i
            WHERE i.id = r.id_inscripcion
              AND i.estado = 'CONFIRMADA'
          )
      `;

      await tx.$executeRaw`
        INSERT INTO recordatorio_evento (id_inscripcion, id_evento, programado_para, reprogramado)
        SELECT i.id,
               e.id,
               e.fecha_inicio - make_interval(hours => ${anticipationHours}::integer),
               true
        FROM inscripcion_evento i
        JOIN evento e ON e.id = i.id_evento
        WHERE i.estado = 'CONFIRMADA'
          AND i.id_usuario IS NOT NULL
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

      return updated;
    }, { timeout: 15000 });

    return { anticipationHours: settings.anticipacion_horas };
  }
}
