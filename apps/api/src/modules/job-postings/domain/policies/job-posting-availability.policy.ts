import { JOB_POSTING_STATUS, normalizeJobPostingStatus } from './job-posting-status.policy';

/** Se conserva tal cual: el repositorio de job-postings y su spec ya dependen de esta lista. */
export const PUBLISHED_JOB_POSTING_STATUSES = ['PUBLICADO', 'PUBLICADA'] as const;

/**
 * HU-14 · Regla ÚNICA de disponibilidad: una vacante acepta postulaciones y
 * aparece en el listado público solo si está PUBLICADA y no pasó su fecha de cierre.
 * Pausada o cerrada => no disponible. La usan job-postings Y vacantes.
 */
export function isJobPostingAvailable(
  status: string | null,
  closingDate: Date | null,
  now: Date,
): boolean {
  const isPublished = normalizeJobPostingStatus(status) === JOB_POSTING_STATUS.PUBLISHED;
  return isPublished && (closingDate === null || closingDate.getTime() > now.getTime());
}