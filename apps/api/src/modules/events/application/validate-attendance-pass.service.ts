import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import type { ActorContext } from '../../../shared/security/contexts/actor-context';
import { findAttendancePass } from '../infrastructure/repositories/find-attendance-pass';
import type { EventAttendanceResult } from '@umsspira/shared-types';

@Injectable()
export class ValidateAttendancePassService {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    actor: ActorContext,
    eventId: string,
    qrToken: string,
  ): Promise<EventAttendanceResult> {
    return this.prisma.$transaction(
      async (tx) => {
        const { event, pass } = await findAttendancePass(tx, actor, eventId, qrToken);
        const result = await tx.asistenciaEvento.createMany({
          data: { id_inscripcion: pass.inscripcion.id, id_usuario_registro: actor.id },
          skipDuplicates: true,
        });
        const attendance = await tx.asistenciaEvento.findUniqueOrThrow({
          where: { id_inscripcion: pass.inscripcion.id },
        });
        return {
          code: result.count === 1 ? 'ATTENDANCE_RECORDED' : 'ATTENDANCE_ALREADY_RECORDED',
          attendanceRecorded: true,
          eventId: event.id,
          eventTitle: event.titulo?.trim() || 'Evento',
          registrationId: attendance.id_inscripcion,
          participantName: pass.inscripcion.usuario?.nombre?.trim() || 'Sin nombre',
          attendedAt: attendance.fecha_asistencia.toISOString(),
        };
      },
      { timeout: 15000 },
    );
  }
}
