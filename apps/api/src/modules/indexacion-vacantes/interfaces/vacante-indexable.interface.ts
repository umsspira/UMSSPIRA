import type { Prisma } from '../../../generated/prisma/client';
import type { JobPostingSearchSource } from '../../../shared/infrastructure/search/job-posting-search-document';

/** Proyeccion oficial que podra utilizar el futuro lector Prisma de HU4. */
export const VACANTE_INDEXACION_SELECT = {
  id: true,
  titulo: true,
  id_empresa: true,
  empresa: { select: { razon_social: true } },
  estado: true,
  created_at: true,
  fecha_cierre: true,
} as const satisfies Prisma.VacanteSelect;

/** Entrada del contrato provisional compartido HU4/HU7; no es un DTO HTTP. */
export type VacanteIndexable = JobPostingSearchSource;
