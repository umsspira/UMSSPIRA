import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import type { MentorRepository } from '../../application/ports/mentor-repository.port';
import type {
  MentorInformationInput,
  ParticipationInput,
} from '../../application/contracts/mentor-inputs';
import { mentorInclude, toAvailability, toMentor } from '../translators/mentor.translator';
import {
  availabilityOrder,
  lockGraduate,
  lockOwnMentor,
  mentorMissing,
} from './mentor-transaction';

@Injectable()
export class PrismaMentorRepository implements MentorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async directory() {
    const rows = await this.prisma.mentor.findMany({
      where: { esta_activo: true, titulado: { usuario: { estado: 'ACTIVO', rol: 'titulado' } } },
      include: {
        ...mentorInclude,
        disponibilidad_mentor_registros: { orderBy: availabilityOrder, take: 1 },
        mentor_area_registros: {
          where: { area: { padre_id: null, esta_activo: true } },
          include: { area: { select: { id: true, nombre: true } } },
        },
      },
      orderBy: [{ fecha_creacion: 'desc' }, { id: 'asc' }],
    });
    return rows
      .filter(
        (row) => toAvailability(row.disponibilidad_mentor_registros[0]).status !== 'NO_DISPONIBLE',
      )
      .map((row) => ({
        mentor: toMentor(row),
        availability: toAvailability(row.disponibilidad_mentor_registros[0]).status,
        areas: row.mentor_area_registros.flatMap((link) =>
          link.area ? [{ id: link.area.id, name: link.area.nombre ?? '' }] : [],
        ),
      }));
  }

  async eligible(userId: string): Promise<boolean> {
    return Boolean(
      await this.prisma.titulado.findFirst({
        where: { id_usuario: userId, usuario: { estado: 'ACTIVO', rol: 'titulado' } },
        select: { id: true },
      }),
    );
  }

  async own(userId: string) {
    const row = await this.prisma.mentor.findFirst({
      where: { titulado: { id_usuario: userId } },
      include: mentorInclude,
    });
    return row ? toMentor(row) : null;
  }

  async participate(userId: string, input: ParticipationInput) {
    return this.prisma.$transaction(
      async (tx) => {
        const graduate = await lockGraduate(tx, userId);
        const existing = await tx.mentor.findUnique({
          where: { id_titulado: graduate.id },
          select: { id: true },
        });
        if (!input.esta_activo && !existing) {
          return mentorMissing();
        }
        const changes = {
          esta_activo: input.esta_activo,
          fecha_actualizacion: new Date(),
          ...(input.esta_activo && input.experiencia !== undefined
            ? { experiencia: input.experiencia }
            : {}),
          ...(input.esta_activo && input.anios_exp !== undefined
            ? { anios_exp: input.anios_exp }
            : {}),
        };
        const row = existing
          ? await tx.mentor.update({
              where: { id: existing.id },
              data: changes,
              include: mentorInclude,
            })
          : await tx.mentor.create({
              data: { ...changes, id_titulado: graduate.id, fecha_creacion: new Date() },
              include: mentorInclude,
            });
        return toMentor(row);
      },
      { timeout: 15000 },
    );
  }

  async updateInformation(userId: string, input: MentorInformationInput) {
    return this.prisma.$transaction(
      async (tx) => {
        const mentor = await lockOwnMentor(tx, userId);
        return toMentor(
          await tx.mentor.update({
            where: { id: mentor.id },
            data: {
              descripcion: input.descripcion ?? null,
              experiencia: input.experiencia,
              informacion_relevante: input.informacion_relevante ?? null,
              foto_perfil: input.foto_perfil ?? null,
              ...(input.anios_exp !== undefined ? { anios_exp: input.anios_exp } : {}),
              fecha_actualizacion: new Date(),
            },
            include: mentorInclude,
          }),
        );
      },
      { timeout: 15000 },
    );
  }

  async clearInformation(userId: string): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
        const mentor = await lockOwnMentor(tx, userId);
        await tx.mentor.update({
          where: { id: mentor.id },
          data: {
            descripcion: null,
            experiencia: null,
            informacion_relevante: null,
            foto_perfil: null,
            fecha_actualizacion: new Date(),
          },
        });
      },
      { timeout: 15000 },
    );
  }

  async deactivate(mentorId: string, careerIds: readonly string[]) {
    return this.prisma.$transaction(
      async (tx) => {
        const allowed = { id: mentorId, titulado: { id_carrera: { in: [...careerIds] } } };
        const initial = await tx.mentor.findFirst({
          where: allowed,
          select: { id_titulado: true },
        });
        if (!initial) {
          return mentorMissing();
        }
        await tx.$queryRaw`SELECT id FROM titulado WHERE id = ${initial.id_titulado}::uuid FOR UPDATE`;
        const current = await tx.mentor.findFirst({ where: allowed, select: { id: true } });
        if (!current) {
          return mentorMissing();
        }
        return toMentor(
          await tx.mentor.update({
            where: { id: mentorId },
            data: { esta_activo: false, fecha_actualizacion: new Date() },
            include: mentorInclude,
          }),
        );
      },
      { timeout: 15000 },
    );
  }
}
