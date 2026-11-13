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
  foto_perfil: z
    .url()
    .max(2048)
    .refine(
      (value) => ['http:', 'https:'].includes(new URL(value).protocol),
      'La foto debe ser una URL HTTP o HTTPS',
    )
    .nullable()
    .optional(),
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

/**
 * CANF-03: un identificador de usuario en el body se acepta y se ignora.
 * La operación siempre se aplica al actor del token.
 */
const ignoredIdentityFields = {
  usuario_id: z.string().optional(),
  usuarioId: z.string().optional(),
  id_usuario: z.string().optional(),
  mentor_id: z.string().optional(),
};

export const onboardingAreasSchema = z.strictObject({
  areaIds: z.array(mentorIdSchema).max(5),
  ...ignoredIdentityFields,
});

export const onboardingInterestsSchema = z.strictObject({
  interestIds: z.array(mentorIdSchema).max(100),
  ...ignoredIdentityFields,
});

export const onboardingScheduleSchema = z.strictObject({
  weekday: z.number().int().min(1).max(7),
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'La hora debe tener el formato HH:MM'),
  end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'La hora debe tener el formato HH:MM'),
});

export const onboardingAvailabilitySchema = z.strictObject({
  availabilityStatus: z.enum(['DISPONIBLE', 'EN_PAUSA', 'NO_DISPONIBLE']),
  schedules: z.array(onboardingScheduleSchema).max(21),
  ...ignoredIdentityFields,
});
