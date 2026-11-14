import { z } from 'zod';

const positiveInteger = (max: number) =>
  z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(max));

/** Parametros opcionales; sin texto se conserva el listado completo existente. */
export const listPublishedJobPostingsSchema = z
  .object({
    search: z.string().trim().max(200).optional(),
    page: positiveInteger(10_000).optional(),
    limit: positiveInteger(100).optional(),
  })
  .refine(({ page = 1, limit = 10 }) => page * limit <= 10_000, {
    message: 'La ventana maxima de busqueda es de 10000 candidatos.',
    path: ['page'],
  });

export type ListPublishedJobPostingsQuery = z.output<
  typeof listPublishedJobPostingsSchema
>;
