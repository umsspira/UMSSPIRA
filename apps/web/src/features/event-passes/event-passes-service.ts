
import type { EventPassDto } from '@umsspira/shared-types';
import { apiClient } from '../../shared/services/api-client';

export async function getMyEventPasses(
  signal?: AbortSignal,
): Promise<EventPassDto[]> {
  return apiClient<EventPassDto[]>('/registrations/my-passes', {
    method: 'GET',
    authenticated: true,
    cache: 'no-store',
    signal,
  });
}
