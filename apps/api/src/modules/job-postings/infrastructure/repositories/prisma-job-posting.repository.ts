import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import type { JobPostingRepository } from '../../application/ports/job-posting-repository.port';
import type { CreateJobPostingInput } from '../../application/contracts/create-job-posting.input';
import { jobPostingSelect, toJobPosting } from '../translators/job-posting.translator';
import { PUBLISHED_JOB_POSTING_STATUSES } from '../../domain/policies/job-posting-availability.policy';
import {
  availableJobPostingDetailSelect,
  availableJobPostingListSelect,
  toJobPostingDetailCandidate,
  toJobPostingListCandidate,
} from '../translators/available-job-posting.translator';
import { normalizeTechnicalRequirementName } from '../../domain/policies/normalize-technical-requirement-name';

@Injectable()
export class PrismaJobPostingRepository implements JobPostingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, input: CreateJobPostingInput, now: Date) {
    try {
      const record = await this.prisma.$transaction(async (tx) => {
        const created = await tx.vacante.create({ data: {
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
        if (input.requisitosTecnicos?.length) {await tx.vacanteRequisitoTecnico.createMany({
          data: input.requisitosTecnicos.map((nombre) => ({ id_vacante: created.id, nombre, nombre_normalizado: normalizeTechnicalRequirementName(nombre) })),
          skipDuplicates: true,
        });}
        return created;
      });
      return toJobPosting(record);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  async listPublished() {
    const records = await this.prisma.vacante.findMany({
      where: { estado: { in: [...PUBLISHED_JOB_POSTING_STATUSES] } },
      orderBy: [
        { fecha_publicacion: { sort: 'desc', nulls: 'last' } },
        { created_at: { sort: 'desc', nulls: 'last' } },
      ],
      select: availableJobPostingListSelect,
    });
    return records.map(toJobPostingListCandidate);
  }

  async findById(id: string) {
    const record = await this.prisma.vacante.findUnique({
      where: { id },
      select: availableJobPostingDetailSelect,
    });
    return record ? toJobPostingDetailCandidate(record) : null;
  }
}
