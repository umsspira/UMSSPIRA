import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import type { JobPostingRepository } from '../../application/ports/job-posting-repository.port';
import type { CreateJobPostingInput } from '../../application/contracts/create-job-posting.input';
import type { PublishedJobPosting } from '../../domain/entities/published-job-posting.entity';
import { jobPostingSelect, toJobPosting } from '../translators/job-posting.translator';

const PUBLISHED_STATES = ['PUBLICADO', 'PUBLICADA', 'ACTIVA', 'ACTIVO', 'ACTIVE', 'PUBLISHED'];

const publishedJobPostingSelect = {
  id: true,
  titulo: true,
  modalidad: true,
  nivel_experiencia: true,
  descripcion_tecnica: true,
  fecha_publicacion: true,
  created_at: true,
  empresa: {
    select: {
      razon_social: true,
      descripcion: true,
      descripcion_larga: true,
      logo_url: true,
      banner_url: true,
    },
  },
  vacante_requerimiento_laboral_registros: {
    select: {
      requerimiento_laboral: {
        select: {
          requerimiento_habilidad_registros: {
            select: {
              nivel_requerimiento: true,
              id_area: true,
              area: { select: { nombre: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.VacanteSelect;

type PublishedJobPostingRecord = Prisma.VacanteGetPayload<{
  select: typeof publishedJobPostingSelect;
}>;

function publishedWhere(now: Date): Prisma.VacanteWhereInput {
  return {
    estado: { in: PUBLISHED_STATES },
    AND: [
      { OR: [{ fecha_publicacion: null }, { fecha_publicacion: { lte: now } }] },
      { OR: [{ fecha_cierre: null }, { fecha_cierre: { gt: now } }] },
    ],
  };
}

function toPublishedJobPosting(record: PublishedJobPostingRecord): PublishedJobPosting {
  const requirements = record.vacante_requerimiento_laboral_registros.flatMap(
    ({ requerimiento_laboral }) =>
      requerimiento_laboral?.requerimiento_habilidad_registros.flatMap(
        ({ area, id_area, nivel_requerimiento }) =>
          area?.nombre
            ? [{
                areaId: id_area,
                name: area.nombre,
                level: nivel_requerimiento,
              }]
            : [],
      ) ?? [],
  );
  const uniqueRequirements = Array.from(
    new Map(
      requirements.map((requirement) => [
        requirement.areaId ?? requirement.name.trim().toLocaleLowerCase(),
        requirement,
      ]),
    ).values(),
  );

  return {
    id: record.id,
    title: record.titulo,
    modality: record.modalidad,
    experienceLevel: record.nivel_experiencia,
    technicalDescription: record.descripcion_tecnica,
    publishedAt: record.fecha_publicacion ?? record.created_at,
    company: record.empresa
      ? {
          name: record.empresa.razon_social,
          description:
            record.empresa.descripcion_larga ?? record.empresa.descripcion,
          logoUrl: record.empresa.logo_url,
          bannerUrl: record.empresa.banner_url,
        }
      : null,
    technicalRequirements: uniqueRequirements,
  };
}

@Injectable()
export class PrismaJobPostingRepository implements JobPostingRepository {
  constructor(private readonly prisma: PrismaService) {}

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

  async listPublished(now: Date): Promise<PublishedJobPosting[]> {
    const records = await this.prisma.vacante.findMany({
      where: publishedWhere(now),
      orderBy: [{ fecha_publicacion: 'desc' }, { created_at: 'desc' }],
      select: publishedJobPostingSelect,
    });

    return records.map(toPublishedJobPosting);
  }

  async findPublishedById(
    id: string,
    now: Date,
  ): Promise<PublishedJobPosting | null> {
    const record = await this.prisma.vacante.findFirst({
      where: { id, ...publishedWhere(now) },
      select: publishedJobPostingSelect,
    });

    return record ? toPublishedJobPosting(record) : null;
  }
}
