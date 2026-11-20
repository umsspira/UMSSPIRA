import { z } from 'zod';
import { REPORT_STATUSES } from '../../domain/entities/graduate-report';

const fields = {
  careerId: z
    .uuid()
    .transform((value) => value.toLowerCase())
    .optional(),
  status: z.enum(REPORT_STATUSES).optional(),
  search: z
    .string()
    .max(100)
    .transform((value) => value.replace(/\s+/g, ' ').trim())
    .optional(),
};
export const reportFilterSchema = z.strictObject(fields);
export const reportMetricsSchema = z.strictObject({ careerId: fields.careerId });
export const graduateListSchema = z.strictObject({
  ...fields,
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(10),
});

/**
 * Filtros del tablero de acreditación en la URL (HU-003): ?careerId&cohorte=2023&semestre=1-2026.
 * El semestre llega con guion porque la barra no va en la URL; adentro se usa 1/2026.
 */
export const accreditationFilterSchema = z
  .strictObject({
    careerId: fields.careerId,
    cohorte: z
      .string()
      .regex(/^\d{4}$/)
      .transform(Number)
      .optional(),
    semestre: z
      .string()
      .regex(/^[12]-\d{4}$/)
      .transform((value) => value.replace('-', '/'))
      .optional(),
  })
  .transform(({ careerId, cohorte, semestre }) => ({
    ...(careerId ? { careerId } : {}),
    ...(cohorte !== undefined ? { cohort: cohorte } : {}),
    ...(semestre ? { semester: semestre } : {}),
  }));
