import { z } from 'zod';
import { MENTORSHIP_REQUEST_STATUSES } from '../../domain/entities/mentorship-request';

export const myMentorshipRequestQuerySchema = z.object({
  // Sin `estado` se devuelven todos los estados del historial propio.
  estado: z.enum(MENTORSHIP_REQUEST_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(20).default(20),
});

export type MyMentorshipRequestQueryParams = z.output<typeof myMentorshipRequestQuerySchema>;
