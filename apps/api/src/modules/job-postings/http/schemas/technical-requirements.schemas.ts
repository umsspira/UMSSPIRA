import { TECHNICAL_REQUIREMENT_LEVELS, TECHNICAL_REQUIREMENT_TYPES } from '@umsspira/shared-types';
import { z } from 'zod';

export const vacancyIdSchema = z.uuid();

const technicalRequirementSchema = z
  .object({
    competenciaTecnica: z.string().trim().min(1).max(120),
    nivelEsperado: z.enum(TECHNICAL_REQUIREMENT_LEVELS),
    tipo: z.enum(TECHNICAL_REQUIREMENT_TYPES),
    descripcion: z.string().trim().max(500).optional().default(''),
  })
  .strict();

export const saveTechnicalRequirementsSchema = z
  .object({
    requisitos: z.array(technicalRequirementSchema).max(50),
  })
  .strict();

export type SaveTechnicalRequirementsBody = z.output<typeof saveTechnicalRequirementsSchema>;
