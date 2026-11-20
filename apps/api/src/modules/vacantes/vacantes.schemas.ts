import { z } from 'zod';
import { technicalRequirementNamesSchema } from '../job-postings/http/schemas/job-postings.schemas';

export const vacancyIdSchema = z.uuid();
export type VacancyId = z.output<typeof vacancyIdSchema>;

export const VACANCY_MODALITIES = ['PRESENCIAL', 'HIBRIDO', 'REMOTO'] as const;

// HU-13: actualización parcial de la vacante con los mismos límites del alta.
// `.strict()` rechaza campos adicionales y se exige al menos un campo para
// proteger el endpoint de envíos vacíos o duplicados sin contenido.
export const updateVacanteSchema = z
  .object({
    titulo: z.string().trim().min(1).max(150).optional(),
    modalidad: z.enum(VACANCY_MODALITIES).optional(),
    nivel_experiencia: z.string().trim().min(1).max(100).optional(),
    descripcion_tecnica: z.string().trim().min(50).max(20000).optional(),
    estado: z.string().trim().min(1).max(20).optional(),
    requisitosTecnicos: technicalRequirementNamesSchema.optional(),
  })
  .strict()
  .refine(
    (body) => Object.values(body).some((value) => value !== undefined),
    { message: 'Debes enviar al menos un campo para actualizar' },
  );

export type UpdateVacanteBody = z.output<typeof updateVacanteSchema>;
