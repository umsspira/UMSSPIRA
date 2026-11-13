import { apiClient } from '@/shared/services/api-client';
import type { ValidateEventPassInput, ValidateEventPassResult } from '@umsspira/shared-types';

export async function validateScannedPass(eventId: string, qrToken: string, signal: AbortSignal) {
  const body: ValidateEventPassInput = { qrToken };
  const response = await apiClient<{ data: ValidateEventPassResult }>(
    `/api/v1/events/owned/${encodeURIComponent(eventId)}/attendance`,
    { method: 'POST', authenticated: true, body, signal },
  );
  if (response?.data?.code !== 'PASS_VALIDATED' || response.data.attendanceRecorded !== false) {
    throw new Error('El servidor devolvió una respuesta de validación inesperada.');
  }
}
