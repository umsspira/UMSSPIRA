
import { apiClient } from '@/shared/services/api-client';

import type { EventCertificate } from './certificate-types';

export async function loadMyCertificates(
  signal?: AbortSignal,
): Promise<EventCertificate[]> {
  return apiClient<EventCertificate[]>('/api/v1/certificates/me', {
    method: 'GET',
    authenticated: true,
    cache: 'no-store',
    signal,
  });
}

export function resolveMyCertificatePdfEndpoint(
  certificateId: string,
): string {
  return `/api/v1/certificates/me/${encodeURIComponent(certificateId)}/download`;
}
