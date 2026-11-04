import { z } from 'zod';
import { PROFILE_SECTIONS } from '../../domain/entities/profile-record';
import { PROFESSIONAL_DESCRIPTION_MAX_LENGTH } from '../../domain/entities/professional-description';

export const profileIdSchema = z.uuid();
export const profileSectionSchema = z.enum(PROFILE_SECTIONS);
export const signedBackupQuerySchema = z.object({
  expira: z.coerce.number().int().positive(),
  firma: z.string().min(1).max(128),
  descargar: z.literal('1').optional(),
});
const yearSchema = z
  .number()
  .int()
  .min(1000)
  .refine((value) => value <= new Date().getFullYear(), 'El año no puede ser futuro');
// Año mínimo de emisión de una certificación (HU-08, T8.3); el mismo que valida el formulario
export const MIN_CERTIFICATION_YEAR = 1980;
const certificationYearSchema = z
  .number()
  .int()
  .min(MIN_CERTIFICATION_YEAR, `El año debe estar entre ${MIN_CERTIFICATION_YEAR} y ${new Date().getFullYear()}`)
  .refine(
    (value) => value <= new Date().getFullYear(),
    `El año debe estar entre ${MIN_CERTIFICATION_YEAR} y ${new Date().getFullYear()}`,
  );
const text = (max: number) => z.string().trim().min(1).max(max);
const dateSchema = z.iso
  .date()
  .refine(
    (value) => value <= new Date().toISOString().slice(0, 10),
    'La fecha no puede ser futura',
  );
// Fecha mínima de una experiencia laboral (BUG-HU2-008); la misma que usa el frontend
export const MIN_EXPERIENCE_DATE = '1950-01-01';
const experienceDateSchema = dateSchema.refine(
  (value) => value >= MIN_EXPERIENCE_DATE,
  'La fecha no puede ser anterior a 1950',
);

export const educationSchema = z.strictObject({
  institucion: text(150),
  titulo: text(150),
  grado: text(50),
  anioEgreso: yearSchema,
});
export const experienceSchema = z
  .strictObject({
    empresa: text(150),
    cargo: text(100),
    fechaInicio: experienceDateSchema,
    fechaFin: experienceDateSchema.nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.fechaFin && value.fechaFin < value.fechaInicio) {
      context.addIssue({
        code: 'custom',
        path: ['fechaFin'],
        message: 'La fecha de fin no puede ser anterior al inicio',
      });
    }
  });
export const certificationSchema = z.strictObject({
  nombre: text(150),
  entidadEmisora: text(150),
  grado: text(50),
  anioEmision: certificationYearSchema,
});
export const DEFAULT_CERTIFICATION_DEGREE = 'Profesional';
export const createCertificationSchema = certificationSchema.extend({
  grado: text(50).default(DEFAULT_CERTIFICATION_DEGREE),
});
// Texto no vacío y hasta 5000 caracteres (T6.4): una descripción vacía se rechaza con 400
export const professionalDescriptionSchema = z.strictObject({
  descripcionProfesional: z
    .string()
    .trim()
    .min(1, 'La descripción no puede estar vacía')
    .max(
      PROFESSIONAL_DESCRIPTION_MAX_LENGTH,
      `La descripción no puede superar ${PROFESSIONAL_DESCRIPTION_MAX_LENGTH} caracteres`,
    ),
});
export type ProfessionalDescriptionBody = z.infer<typeof professionalDescriptionSchema>;
export const profileChangeSchema = z.discriminatedUnion('section', [
  z.strictObject({ section: z.literal('formacion-academica'), data: educationSchema }),
  z.strictObject({ section: z.literal('experiencia-laboral'), data: experienceSchema }),
  z.strictObject({ section: z.literal('certificaciones'), data: certificationSchema }),
]);
