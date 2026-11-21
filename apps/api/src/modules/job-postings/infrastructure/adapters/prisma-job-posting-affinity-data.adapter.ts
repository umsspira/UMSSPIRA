import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import type { Prisma } from '../../../../generated/prisma/client';
import type {
  JobPostingAffinityDataPort,
  JobPostingAffinityProfile,
  JobPostingAffinityRequirements,
} from '../../application/ports/job-posting-affinity-data.port';
import type { JobPostingAffinityBatchDataPort } from '../../application/ports/job-posting-affinity-batch-data.port';
import { PUBLISHED_JOB_POSTING_STATUSES } from '../../domain/policies/job-posting-availability.policy';

@Injectable()
export class PrismaJobPostingAffinityDataAdapter
  implements JobPostingAffinityDataPort, JobPostingAffinityBatchDataPort
{
  constructor(private readonly prisma: PrismaService) {}

  async readProfiles(userIds: readonly string[], db: Prisma.TransactionClient | PrismaService = this.prisma): Promise<JobPostingAffinityProfile[]> {
    if (!userIds.length) {
      return [];
    }
    const profiles = await db.titulado.findMany({
      where: { id_usuario: { in: [...new Set(userIds)] } },
      select: {
        id: true,
        id_usuario: true,
        formacion_academica_registros: { select: { titulo: true, institucion: true } },
        experiencia_laboral_registros: { select: { cargo: true, empresa: true } },
        certificacion_registros: { select: { nombre: true, entidad_emisora: true } },
        proyecto_registros: { select: { nombre: true, descripcion: true, tecnologias: true } },
        perfil_area_registros: {
          // Misma descripción vigente que el módulo de perfil: primera fila estable.
          orderBy: [{ fecha_creacion: 'asc' }, { id: 'asc' }],
          take: 1,
          select: { descripcion_profesional: true },
        },
      },
    });
    return profiles.flatMap((profile) => {
      if (!profile.id_usuario) {
        return [];
      }
      const education = profile.formacion_academica_registros;
      const experience = profile.experiencia_laboral_registros;
      const certification = profile.certificacion_registros;
      const projects = profile.proyecto_registros;
      const description = profile.perfil_area_registros[0]?.descripcion_profesional ?? null;
      const texts = [
        description,
        ...education.flatMap((item) => [item.titulo, item.institucion]),
        ...experience.flatMap((item) => [item.cargo, item.empresa]),
        ...certification.flatMap((item) => [item.nombre, item.entidad_emisora]),
        ...projects.flatMap((item) => [item.nombre, item.descripcion, item.tecnologias]),
      ].filter((text): text is string => typeof text === 'string' && text.trim().length > 0);
      return [
        {
          userId: profile.id_usuario,
          tituladoId: profile.id,
          texts: texts.map((text) => text.trim()),
          description,
          hasEducation: education.length > 0,
          hasExperience: experience.length > 0,
          hasCertification: certification.length > 0,
          hasProject: projects.length > 0,
        },
      ];
    });
  }

  async readRequirements(vacancyIds: readonly string[], db: Prisma.TransactionClient | PrismaService = this.prisma): Promise<JobPostingAffinityRequirements[]> {
    if (!vacancyIds.length) {
      return [];
    }
    const vacancies = await db.vacante.findMany({
      where: { id: { in: [...new Set(vacancyIds)] } },
      select: {
        id: true,
        requisito_tecnico_registros: {
          orderBy: [{ nombre_normalizado: 'asc' }, { id: 'asc' }],
          select: { nombre: true },
        },
      },
    });
    return vacancies.map((vacancy) => ({
      vacancyId: vacancy.id,
      requirements: vacancy.requisito_tecnico_registros.map((item) => item.nombre),
    }));
  }

  async readPublicVacancies(
    vacancyIds: readonly string[],
    now: Date,
  ): Promise<JobPostingAffinityRequirements[]> {
    if (!vacancyIds.length) {return [];}
    const records = await this.prisma.vacante.findMany({
      where: {
        id: { in: [...vacancyIds] },
        estado: { in: [...PUBLISHED_JOB_POSTING_STATUSES] },
        OR: [{ fecha_cierre: null }, { fecha_cierre: { gt: now } }],
      },
      select: {
        id: true,
        requisito_tecnico_registros: {
          orderBy: [{ nombre_normalizado: 'asc' }, { id: 'asc' }],
          select: { nombre: true },
        },
      },
    });
    return records.map((record) => ({
      vacancyId: record.id,
      requirements: record.requisito_tecnico_registros.map((item) => item.nombre),
    }));
  }


  async readCompanyVacancyApplications(
    vacancyId: string,
    actorUserId: string,
    applicationIds: readonly string[],
  ) {
    const record = await this.prisma.vacante.findFirst({
      where: {
        id: vacancyId,
        empresa: {
          OR: [
            { id_usuario: actorUserId },
            { empresa_usuario_registros: { some: { id_usuario: actorUserId, estado: 'activo' } } },
          ],
        },
      },
      select: {
        id: true,
        requisito_tecnico_registros: {
          orderBy: [{ nombre_normalizado: 'asc' }, { id: 'asc' }],
          select: { nombre: true },
        },
        postulacion_registros: {
          where: { id: { in: [...applicationIds] } },
          select: { id: true, id_usuario: true },
        },
      },
    });
    if (!record) {return null;}
    return {
      vacancy: {
        vacancyId: record.id,
        requirements: record.requisito_tecnico_registros.map((item) => item.nombre),
      },
      applications: record.postulacion_registros.map((application) => ({
        applicationId: application.id,
        userId: application.id_usuario,
      })),
    };
  }

}
