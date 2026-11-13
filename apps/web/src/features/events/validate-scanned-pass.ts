import { apiClient } from '@/shared/services/api-client';

export async function validateScannedPass(eventId: string, qrToken: string, signal: AbortSignal) {
  const response = await apiClient<{ data: { code: 'PASS_VALIDATED'; attendanceRecorded: false } }>(
    `/api/v1/events/owned/${encodeURIComponent(eventId)}/attendance`,
    { method: 'POST', authenticated: true, body: { qrToken }, signal },
  );
  if (response?.data?.code !== 'PASS_VALIDATED' || response.data.attendanceRecorded !== false) {
    throw new Error('El servidor devolvió una respuesta de validación inesperada.');
  }
}
