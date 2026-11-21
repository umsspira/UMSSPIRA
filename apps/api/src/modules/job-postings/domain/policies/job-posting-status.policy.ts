/**
 * HU-14 · Vocabulario ÚNICO de estados de una vacante.
 *
 * Los módulos `job-postings` y `vacantes` usaban cada uno su propia lista
 * (PUBLICADO / PUBLICADA / ACTIVA / ACTIVO / CERRADO / CERRADA / PAUSADA…).
 * Ahora ambos importan este archivo. El valor canónico es PUBLICADO | PAUSADO | CERRADO
 * (el mismo que ya usa el dominio de job-postings, los seeds y los tests). En la base
 * de datos SOLO se escribe el canónico; los alias se aceptan al LEER para tolerar datos
 * viejos hasta que se aplique la migración de normalización.
 */
export const JOB_POSTING_STATUS = {
  PUBLISHED: 'PUBLICADO',
  PAUSED: 'PAUSADO',
  CLOSED: 'CERRADO',
} as const;

export type JobPostingStatus = (typeof JOB_POSTING_STATUS)[keyof typeof JOB_POSTING_STATUS];

const STATUS_ALIASES: Readonly<Record<string, JobPostingStatus>> = {
  PUBLICADA: JOB_POSTING_STATUS.PUBLISHED,
  PUBLICADO: JOB_POSTING_STATUS.PUBLISHED,
  ACTIVA: JOB_POSTING_STATUS.PUBLISHED,
  ACTIVO: JOB_POSTING_STATUS.PUBLISHED,
  ACTIVE: JOB_POSTING_STATUS.PUBLISHED,
  PUBLISHED: JOB_POSTING_STATUS.PUBLISHED,
  PAUSADA: JOB_POSTING_STATUS.PAUSED,
  PAUSADO: JOB_POSTING_STATUS.PAUSED,
  PAUSED: JOB_POSTING_STATUS.PAUSED,
  CERRADA: JOB_POSTING_STATUS.CLOSED,
  CERRADO: JOB_POSTING_STATUS.CLOSED,
  CLOSED: JOB_POSTING_STATUS.CLOSED,
};

/**
 * Valores crudos que significan "publicada". Se usa en filtros de Prisma
 * (`estado: { in: [...PUBLISHED_STATUS_VALUES] }`). Tras la migración solo
 * existirá 'PUBLICADO'; los demás son tolerancia temporal.
 */
export const PUBLISHED_STATUS_VALUES = [
  'PUBLICADO',
  'PUBLICADA',
  'ACTIVA',
  'ACTIVO',
  'ACTIVE',
  'PUBLISHED',
] as const;

/** Devuelve el estado canónico, o null si el valor no pertenece al vocabulario (p. ej. BORRADOR). */
export function normalizeJobPostingStatus(raw: string | null | undefined): JobPostingStatus | null {
  if (typeof raw !== 'string') {
    return null;
  }
  return STATUS_ALIASES[raw.trim().toUpperCase()] ?? null;
}

const ALLOWED_TRANSITIONS: Readonly<Record<JobPostingStatus, readonly JobPostingStatus[]>> = {
  PUBLICADO: [JOB_POSTING_STATUS.PAUSED, JOB_POSTING_STATUS.CLOSED],
  PAUSADO: [JOB_POSTING_STATUS.PUBLISHED, JOB_POSTING_STATUS.CLOSED],
  // Cerrar es irreversible (la UI lo advierte): no hay salida desde CERRADO.
  CERRADO: [],
};

/** Regla única de transiciones. Pasar al mismo estado NO es una transición (se trata como idempotente). */
export function canTransitionJobPostingStatus(
  from: JobPostingStatus,
  to: JobPostingStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}