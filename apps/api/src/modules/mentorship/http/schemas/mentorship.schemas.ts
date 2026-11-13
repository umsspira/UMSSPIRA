import { z } from 'zod';

export const mentorIdSchema = z.uuid().transform((value) => value.toLowerCase());
export const participationSchema = z.strictObject({
  esta_activo: z.boolean(),
  experiencia: z.string().trim().max(5000).optional(),
  anios_exp: z.number().int().min(0).max(80).optional(),
});
export const mentorInformationSchema = z.strictObject({
  descripcion: z.string().trim().max(500).optional(),
  experiencia: z.string().trim().min(1).max(800),
  informacion_relevante: z.string().trim().max(500).nullable().optional(),
  anios_exp: z.number().int().min(0).max(80).optional(),
});
export const mentorAreasSchema = z.strictObject({
  areaIds: z
    .array(mentorIdSchema)
    .min(1)
    .max(5)
    .transform((ids) => [...new Set(ids)]),
});
export const mentorInterestsSchema = z.strictObject({
  ids: z.array(mentorIdSchema).min(1).max(100),
});
export const availabilitySchema = z.strictObject({
  availabilityStatus: z.enum(['DISPONIBLE', 'EN_PAUSA', 'NO_DISPONIBLE']),
});
