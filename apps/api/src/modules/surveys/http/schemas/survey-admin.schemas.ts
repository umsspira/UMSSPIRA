import { z } from 'zod';

const surveyDates = {
  title: z.string().trim().min(1).max(200),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  format: z.string().trim().min(1).max(30).optional(),
};

export const createSurveyAdminSchema = z.object(surveyDates).strict();
export const updateSurveyAdminSchema = z.object(surveyDates).partial().strict();
export const surveyIdSchema = z.string().uuid();

export type CreateSurveyAdminDto = z.infer<typeof createSurveyAdminSchema>;
export type UpdateSurveyAdminDto = z.infer<typeof updateSurveyAdminSchema>;
