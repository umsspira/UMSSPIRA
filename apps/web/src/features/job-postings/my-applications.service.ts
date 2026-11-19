import { z } from 'zod';
import { apiFetch } from '@/shared/services/api-client';

const myApplicationSchema = z.object({
  id: z.string().uuid(),
  vacancyId: z.string().uuid().nullable(),
  vacancyTitle: z.string().nullable(),
  companyName: z.string().nullable(),
  appliedAt: z.string().datetime({ offset: true }).nullable(),
  matchPercentage: z.number().min(0).max(100).nullable(),
  isVacancyAvailable: z.boolean(),
});

const vacancyOfferSchema = z.object({
  id: z.string().uuid(),
  title: z.string().nullable(),
  companyName: z.string().nullable(),
  description: z.string().nullable(),
  modality: z.string().nullable(),
  experienceLevel: z.string().nullable(),
  publishedAt: z.string().datetime({ offset: true }).nullable(),
  isAvailable: z.boolean(),
});

export type MyApplication = z.infer<typeof myApplicationSchema>;
export type VacancyOffer = z.infer<typeof vacancyOfferSchema>;

export async function fetchMyApplications(): Promise<MyApplication[]> {
  const data = await apiFetch<unknown>('/api/v1/vacantes/mis-postulaciones');
  return z.array(myApplicationSchema).parse(data);
}

export async function fetchVacancyOffer(vacancyId: string): Promise<VacancyOffer> {
  const data = await apiFetch<unknown>(
    `/api/v1/vacantes/${encodeURIComponent(vacancyId)}/oferta`,
  );
  return vacancyOfferSchema.parse(data);
}
