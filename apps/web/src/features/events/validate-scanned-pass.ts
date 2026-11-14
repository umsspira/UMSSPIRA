import { apiClient } from '@/shared/services/api-client';
import type { ValidateEventPassInput, EventAttendanceResult } from '@umsspira/shared-types';
import { z } from 'zod';

const attendanceResultSchema = z.object({
  code: z.enum(['ATTENDANCE_RECORDED', 'ATTENDANCE_ALREADY_RECORDED']),
  attendanceRecorded: z.literal(true),
  eventId: z.string().min(1),
  eventTitle: z.string().min(1),
  registrationId: z.string().min(1),
  participantName: z.string().min(1),
  attendedAt: z.iso.datetime({ offset: true }),
}) satisfies z.ZodType<EventAttendanceResult>;

export async function validateScannedPass(eventId: string, qrToken: string, signal: AbortSignal) {
  const body: ValidateEventPassInput = { qrToken };
  const response = await apiClient<{ data: unknown }>(
    `/api/v1/events/owned/${encodeURIComponent(eventId)}/attendance`,
    { method: 'POST', authenticated: true, body, signal },
  );
  const result = attendanceResultSchema.safeParse(response?.data);
  if (!result.success) {
    throw new Error('El servidor devolvió una respuesta de validación inesperada.');
  }
  return result.data;
}
