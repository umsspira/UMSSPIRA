import { z } from 'zod';

// Mismo tratamiento del correo que el login y la recuperación.
export const statusQuerySchema = z
  .object({ email: z.string().trim().toLowerCase().max(254).pipe(z.email()) })
  .strict();

export type StatusQueryBody = z.output<typeof statusQuerySchema>;