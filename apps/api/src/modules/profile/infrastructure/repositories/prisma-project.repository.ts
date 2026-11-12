import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import type { ProfileScope } from '../../application/contracts/profile-inputs';
import type { ProjectInput } from '../../application/contracts/project-inputs';
import type { ProjectRepository } from '../../application/ports/project-repository.port';
import { toProject } from '../translators/project.translator';
import { lockGraduate, rejectProfileRecord } from './profile-transaction';

// Del más reciente al más antiguo; el id desempata para que el orden sea estable
const projectOrder = [{ fecha_creacion: 'desc' as const }, { id: 'asc' as const }];

function projectData(input: ProjectInput) {
  return {
    nombre: input.nombre,
    url: input.url,
    descripcion: input.descripcion || null,
  };
}

@Injectable()
export class PrismaProjectRepository implements ProjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(scope: ProfileScope) {
    const rows = await this.prisma.proyecto.findMany({
      where: { id_titulado: scope.graduateId, titulado: { id_usuario: scope.userId } },
      orderBy: projectOrder,
    });
    return rows.map(toProject);
  }

  async create(scope: ProfileScope, input: ProjectInput) {
    return this.prisma.$transaction(
      async (tx) => {
        // Comprueba que el titulado de la sesión existe y pertenece al usuario
        await lockGraduate(tx, scope);
        return toProject(
          await tx.proyecto.create({
            data: { id_titulado: scope.graduateId, ...projectData(input) },
          }),
        );
      },
      { timeout: 15000 },
    );
  }

  async update(scope: ProfileScope, id: string, input: ProjectInput) {
    return this.prisma.$transaction(
      async (tx) => {
        await lockGraduate(tx, scope);
        const { count } = await tx.proyecto.updateMany({
          where: { id, id_titulado: scope.graduateId },
          data: { ...projectData(input), fecha_actualizacion: new Date() },
        });
        if (!count) {
          // 403 si el proyecto es de otro titulado, 404 si no existe
          await rejectProfileRecord(
            tx.proyecto.findUnique({ where: { id }, select: { id: true } }),
          );
        }
        return toProject(await tx.proyecto.findUniqueOrThrow({ where: { id } }));
      },
      { timeout: 15000 },
    );
  }

  async remove(scope: ProfileScope, id: string) {
    await this.prisma.$transaction(
      async (tx) => {
        await lockGraduate(tx, scope);
        const { count } = await tx.proyecto.deleteMany({
          where: { id, id_titulado: scope.graduateId },
        });
        if (!count) {
          await rejectProfileRecord(
            tx.proyecto.findUnique({ where: { id }, select: { id: true } }),
          );
        }
      },
      { timeout: 15000 },
    );
  }
}
