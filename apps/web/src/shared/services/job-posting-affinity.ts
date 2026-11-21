import type {
  JobPostingAffinityBatchError,
  JobPostingAffinityBatchItem,
  JobPostingAffinityBatchRequest,
  JobPostingAffinityComparison,
  JobPostingAffinityResult,
} from '@umsspira/shared-types';
import { JOB_POSTING_AFFINITY_BATCH_LIMIT } from '@umsspira/shared-types';
import { apiFetch } from './api-client';

export type {
  JobPostingAffinityBatchError,
  JobPostingAffinityBatchItem,
  JobPostingAffinityComparison,
  JobPostingAffinityResult,
};

/**
 * Consulta la afinidad de una o varias vacantes mediante el endpoint POST /api/v1/affinity/batch.
 * Si el conjunto supera los 50 elementos (límite del endpoint), se divide en fragmentos de máximo 50.
 */
export async function getVacanciesAffinityBatch(
  vacancyIds: string[],
): Promise<Record<string, JobPostingAffinityBatchItem>> {
  if (vacancyIds.length === 0) return {};
  const uniqueIds = Array.from(new Set(vacancyIds));
  const chunks: string[][] = [];
  for (let i = 0; i < uniqueIds.length; i += JOB_POSTING_AFFINITY_BATCH_LIMIT) {
    chunks.push(uniqueIds.slice(i, i + JOB_POSTING_AFFINITY_BATCH_LIMIT));
  }

  const results: Record<string, JobPostingAffinityBatchItem> = {};
  for (const chunk of chunks) {
    const items = await apiFetch<JobPostingAffinityBatchItem[]>('/api/v1/affinity/batch', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'vacancies',
        vacancyIds: chunk,
      } satisfies JobPostingAffinityBatchRequest),
    });
    for (const item of items ?? []) {
      results[item.vacancyId] = item;
    }
  }
  return results;
}

/**
 * Consulta la afinidad de una vacante individual para la vista de detalle.
 */
export async function getVacancyAffinity(
  vacancyId: string,
): Promise<JobPostingAffinityBatchItem> {
  const map = await getVacanciesAffinityBatch([vacancyId]);
  const item = map[vacancyId];
  if (!item) {
    throw new Error('No se recibió resultado de afinidad para la vacante seleccionada');
  }
  return item;
}

/**
 * Función de conveniencia para la vista de detalle de vacante.
 */
export async function calculateVacancyAffinity(
  vacancyId: string,
): Promise<JobPostingAffinityResult> {
  const item = await getVacancyAffinity(vacancyId);
  if (item.error) {
    // El detalle lee code y retryable del error para decidir si ofrece «Reintentar»
    throw Object.assign(new Error(item.error.message), {
      code: item.error.code,
      retryable: item.error.retryable,
    });
  }
  return item.result;
}
