import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import type { JobPostingRepository } from '../../application/ports/job-posting-repository.port';
import type { CreateJobPostingInput } from '../../application/contracts/create-job-posting.input';
import type { AvailableJobPosting } from '../../domain/entities/available-job-posting.entity';
import { calculateJobAffinity } from '../../domain/policies/calculate-job-affinity.policy';
import { jobPostingSelect, toJobPosting } from '../translators/job-posting.translator';

@Injectable()
export class PrismaJobPostingRepository implements JobPostingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listAvailable(
    graduateId: string | null,
    now: Date,
  ): Promise<AvailableJobPosting[]> {
    const latestRadar = graduateId
      ? await this.prisma.calculoRadar.findFirst({
          where: { id_titulado: graduateId },
          orderBy: [{ fecha_calculo: 'desc' }, { id: 'desc' }],
          select: {
            afinidad_registros: { select: { id_area: true, porcentaje: true } },
          },
        })
      : null;
    const radarAreas = latestRadar?.afinidad_registros.map((area) => ({
      areaId: area.id_area,
      percentage: Number(area.porcentaje),
    })) ?? null;

    const records = await this.prisma.vacante.findMany({
      where: {
        estado: 'PUBLICADO',
        empresa: { isNot: null },
        AND: [
          { OR: [{ fecha_publicacion: null }, { fecha_publicacion: { lte: now } }] },
          { OR: [{ fecha_cierre: null }, { fecha_cierre: { gte: now } }] },
        ],
      },
      select: {
        id: true,
        titulo: true,
        modalidad: true,
        nivel_experiencia: true,
        descripcion_tecnica: true,
        created_at: true,
        fecha_publicacion: true,
        empresa: {
          select: {
            razon_social: true,
            logo_url: true,
            sector_empresa_registros: {
              where: { estado: 'ACTIVO' },
              orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
              take: 1,
              select: { nombre: true },
            },
            direccion_empresa_registros: {
              orderBy: [{ departamento: 'asc' }, { id: 'asc' }],
              take: 1,
              select: { departamento: true },
            },
          },
        },
        vacante_requerimiento_laboral_registros: {
          orderBy: [{ id_requerimiento_laboral: 'asc' }],
          select: {
            requerimiento_laboral: {
              select: {
                ubicacion: true,
                requerimiento_habilidad_registros: {
                  orderBy: [{ id: 'asc' }],
                  select: { id_area: true, area: { select: { nombre: true } } },
                },
              },
            },
          },
        },
      },
    });

    return records.flatMap((record) => {
      const company = record.empresa;
      if (!company || !record.titulo || !record.modalidad || !record.nivel_experiencia) {
        return [];
      }

      const requirements = record.vacante_requerimiento_laboral_registros
        .map(({ requerimiento_laboral }) => requerimiento_laboral)
        .filter((requirement) => requirement !== null);
      const requiredSkills = requirements.flatMap(
        (requirement) => requirement.requerimiento_habilidad_registros,
      );
      const affinity = calculateJobAffinity(
        requiredSkills.map((skill) => skill.id_area),
        radarAreas,
      );
      const firstSkill = requiredSkills.find((skill) => skill.area?.nombre);
      const firstLocation = requirements.find((requirement) => requirement.ubicacion)?.ubicacion;

      return [{
        id: record.id,
        title: record.titulo,
        companyName: company.razon_social || 'Empresa',
        companyLogoUrl: company.logo_url,
        technicalDescription: record.descripcion_tecnica || '',
        area: firstSkill?.area?.nombre ??
          company.sector_empresa_registros[0]?.nombre ?? null,
        modality: record.modalidad,
        experienceLevel: record.nivel_experiencia,
        location: firstLocation ?? company.direccion_empresa_registros[0]?.departamento ?? null,
        publishedAt: record.fecha_publicacion ?? record.created_at,
        affinityPercentage: affinity,
      }];
    });
  }

  async create(ownerId: string, input: CreateJobPostingInput, now: Date) {
    try {
      const record = await this.prisma.vacante.create({
        data: {
          empresa: { connect: { id: input.empresaId, id_usuario: ownerId } },
          titulo: input.titulo,
          modalidad: input.modalidad,
          nivel_experiencia: input.nivelExperiencia,
          descripcion_tecnica: input.descripcionTecnica,
          estado: 'PUBLICADO',
          created_at: now,
        },
        select: jobPostingSelect,
      });
      return toJobPosting(record);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }
}
