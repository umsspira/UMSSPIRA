import { z } from 'zod';
import { JOB_MODALITIES } from '../../domain/entities/job-posting.entity';

export const technicalRequirementNamesSchema = z.array(z.string().trim().min(1).max(200)).max(30)
  .superRefine((names, context) => {
    const normalized = names.map((name) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').toLowerCase());
    if (new Set(normalized).size !== normalized.length) {context.addIssue({ code: 'custom', message: 'No se permiten requisitos duplicados' });}
  });

export const createJobPostingSchema = z
  .object({
    empresaId: z.uuid(),
    titulo: z.string().trim().min(1).max(150),
    modalidad: z.enum(JOB_MODALITIES),
    nivelExperiencia: z.string().trim().min(1).max(100),
    descripcionTecnica: z.string().trim().min(50).max(20000),
    requisitosTecnicos: technicalRequirementNamesSchema.optional().default([]),
  })
  .strict();

export type CreateJobPostingBody = z.output<typeof createJobPostingSchema>;

export const jobPostingIdSchema = z.uuid();
