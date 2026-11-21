import { z } from 'zod';
import { JOB_POSTING_AFFINITY_BATCH_LIMIT } from '@umsspira/shared-types';

const uuid = z.string().uuid();
const idList = z.array(uuid).min(1).max(JOB_POSTING_AFFINITY_BATCH_LIMIT);

export const jobPostingAffinityBatchSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('vacancies'), vacancyIds: idList }).strict().refine(
    ({ vacancyIds }) => new Set(vacancyIds).size === vacancyIds.length,
    { message: 'No se permiten IDs de vacantes duplicados', path: ['vacancyIds'] },
  ),
  z.object({ mode: z.literal('applicants'), vacancyId: uuid, applicationIds: idList }).strict().refine(
    ({ applicationIds }) => new Set(applicationIds).size === applicationIds.length,
    { message: 'No se permiten IDs de postulaciones duplicados', path: ['applicationIds'] },
  ),
]);


export type JobPostingAffinityBatchInput = z.infer<typeof jobPostingAffinityBatchSchema>;
