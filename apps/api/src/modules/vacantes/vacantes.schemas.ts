import { z } from 'zod';

export const vacancyIdSchema = z.uuid();
export type VacancyId = z.output<typeof vacancyIdSchema>;
