import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';

/** HU-21 CA-09: un titulado puede tener como máximo 2 trabajos actuales (experiencias sin fecha fin). */
export const MAX_CURRENT_JOBS = 2;
export const MAX_CURRENT_JOBS_MESSAGE = 'Ya tienes dos trabajos actuales';

/**
 * otherCurrentJobs = trabajos actuales ya guardados, sin contar el que se crea o edita.
 * Solo se rechaza si el registro que se guarda también es actual.
 */
export function assertCurrentJobsLimit(isCurrentJob: boolean, otherCurrentJobs: number): void {
  if (isCurrentJob && otherCurrentJobs >= MAX_CURRENT_JOBS) {
    throw new BusinessRuleError('conflict', 'CURRENT_JOBS_LIMIT', MAX_CURRENT_JOBS_MESSAGE);
  }
}
