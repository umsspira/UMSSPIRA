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
  descripcion_tecnica: true,
  modalidad: true,
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
  empresa: {
    select: {
      razon_social: true,
      sector_empresa_registros: { orderBy: { id: 'asc' }, take: 1, select: { nombre: true } },
      direccion_empresa_registros: { orderBy: { id: 'asc' }, take: 1, select: { departamento: true } },
    },
  },
} satisfies Prisma.VacanteSelect;

export const availableJobPostingDetailSelect = {
  ...availableJobPostingListSelect,
  nivel_experiencia: true,
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
    areaName: record.empresa?.sector_empresa_registros[0]?.nombre ?? null,
    locationName: record.empresa?.direccion_empresa_registros[0]?.departamento ?? null,
    technicalDescription: record.descripcion_tecnica,
    modality: record.modalidad,
    requirements: record.requisito_tecnico_registros.map((requirement) => ({
      id: requirement.id,
      name: requirement.nombre,
      normalizedName: requirement.nombre_normalizado,
    })),
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
  };
}
