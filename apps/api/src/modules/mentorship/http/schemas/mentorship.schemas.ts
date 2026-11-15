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
export const saveMentorInterestsSchema = z.strictObject({
  areaIds: z
    .array(mentorIdSchema)
    .min(1)
    .max(5)
    .refine((ids) => new Set(ids).size === ids.length, { message: 'No repitas un área' }),
  topicIds: z
    .array(mentorIdSchema)
    .max(100)
    .refine((ids) => new Set(ids).size === ids.length, { message: 'No repitas un tópico' }),
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

export const createCustomInterestSchema = z.strictObject({
  areaId: mentorIdSchema,
  texto: z.string(),
});
export const updateCustomInterestSchema = z.strictObject({
  texto: z.string(),
});

const scheduleTimeSchema = z.string().regex(/^\d{2}:\d{2}$/, 'La hora debe tener el formato HH:MM');
export const mentorScheduleSchema = z.strictObject({
  // 7 días × 6 franjas; las reglas de negocio las valida la política del dominio.
  schedule: z
    .array(
      z.strictObject({
        weekday: z.number().int().min(1).max(7),
        start: scheduleTimeSchema,
        end: scheduleTimeSchema,
      }),
    )
    .max(42),
});
