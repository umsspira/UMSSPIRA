import type { Prisma } from '../../../../generated/prisma/client';
import { AppError } from '../../../../shared/errors/app-error';
import type {
  JobPostingDetailCandidate,
  JobPostingListCandidate,
} from '../../application/contracts/available-job-posting';

export const availableJobPostingListSelect = {
  id: true,
  titulo: true,
  estado: true,
  fecha_cierre: true,
  fecha_publicacion: true,
  empresa: {
    select: {
      razon_social: true,
    },
  },
} satisfies Prisma.VacanteSelect;

export const availableJobPostingDetailSelect = {
  ...availableJobPostingListSelect,
  descripcion_tecnica: true,
  modalidad: true,
  nivel_experiencia: true,
  requisito_tecnico_registros: {
    select: {
      id: true,
      nombre: true,
      nombre_normalizado: true,
    },
    orderBy: {
      nombre: 'asc',
    },
  },
} satisfies Prisma.VacanteSelect;

type JobPostingListRecord = Prisma.VacanteGetPayload<{
  select: typeof availableJobPostingListSelect;
}>;

type JobPostingDetailRecord = Prisma.VacanteGetPayload<{
  select: typeof availableJobPostingDetailSelect;
}>;

export function toJobPostingListCandidate(record: JobPostingListRecord): JobPostingListCandidate {
  if (record.titulo === null) {
    throw new AppError('INVALID_JOB_POSTING_RECORD', 'La vacante almacenada no tiene título');
  }
  return {
    id: record.id,
    title: record.titulo,
    status: record.estado,
    closingDate: record.fecha_cierre,
    publicationDate: record.fecha_publicacion,
    companyName: record.empresa?.razon_social ?? null,
  };
}

export function toJobPostingDetailCandidate(
  record: JobPostingDetailRecord,
): JobPostingDetailCandidate {
  return {
    ...toJobPostingListCandidate(record),
    technicalDescription: record.descripcion_tecnica,
    modality: record.modalidad,
    experienceLevel: record.nivel_experiencia,
    requirements: record.requisito_tecnico_registros.map((requirement) => ({
      id: requirement.id,
      name: requirement.nombre,
      normalizedName: requirement.nombre_normalizado,
    })),
  };
}
