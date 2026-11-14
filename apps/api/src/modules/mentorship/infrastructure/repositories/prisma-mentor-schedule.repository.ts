import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import type { MentorScheduleRepository } from '../../application/ports/mentor-schedule-repository.port';
import type { MentorSchedule, MentorWeeklySchedule } from '../../domain/entities/mentor';
import { toSchedule } from '../translators/mentor.translator';
import { requireOwnMentor } from './mentor-catalog-reader';
import { lockOwnMentor } from './mentor-transaction';

const toDatabaseTime = (time: string) => new Date(`1970-01-01T${time}:00.000Z`);
// La 6.10 busca los espacios con Date.getUTCDay() (domingo = 0); el dominio usa 1 = lunes … 7 = domingo.
const toDatabaseWeekday = (weekday: number) => weekday % 7;

async function readActive(db: Prisma.TransactionClient, mentorId: string): Promise<MentorWeeklySchedule> {
  const rows = await db.espacioDisponibleMentor.findMany({
    where: { id_mentor: mentorId, esta_activo: true },
    orderBy: [{ dia_semana: 'asc' }, { horario_inicio: 'asc' }, { id: 'asc' }],
    select: {
      dia_semana: true,
      horario_inicio: true,
      horario_fin: true,
      fecha_creacion: true,
      fecha_actualizacion: true,
    },
  });
  const schedule = rows
    .flatMap(toSchedule)
    .sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start));
  const updatedAt = rows.reduce<Date | null>((latest, row) => {
    const value = row.fecha_actualizacion ?? row.fecha_creacion;
    return value && (!latest || value > latest) ? value : latest;
  }, null);
  return { schedule, updatedAt };
}

@Injectable()
export class PrismaMentorScheduleRepository implements MentorScheduleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async own(userId: string) {
    const mentor = await requireOwnMentor(this.prisma, userId, true);
    return readActive(this.prisma, mentor.id);
  }

  async replace(userId: string, schedule: MentorSchedule[]) {
    return this.prisma.$transaction(
      async (tx) => {
        const mentor = await lockOwnMentor(tx, userId, true);
        const today = new Date();
        // Se desactivan las franjas anteriores en lugar de borrarlas, para conservar el historial.
        await tx.espacioDisponibleMentor.updateMany({
          where: { id_mentor: mentor.id, esta_activo: true },
          data: { esta_activo: false, fecha_actualizacion: today },
        });
        if (schedule.length) {
          await tx.espacioDisponibleMentor.createMany({
            data: schedule.map((slot) => ({
              id_mentor: mentor.id,
              dia_semana: toDatabaseWeekday(slot.weekday),
              horario_inicio: toDatabaseTime(slot.start),
              horario_fin: toDatabaseTime(slot.end),
              esta_activo: true,
              fecha_creacion: today,
              fecha_actualizacion: today,
            })),
          });
        }
        // El horario semanal reemplaza la ventana global que solo cargaba la seed.
        await tx.disponibilidadMentor.updateMany({
          where: { id_mentor: mentor.id },
          data: { hora_inicio: null, hora_fin: null },
        });
        // Las solicitudes ya registradas no se tocan (CA-F 08).
        return readActive(tx, mentor.id);
      },
      { timeout: 15000 },
    );
  }
}
