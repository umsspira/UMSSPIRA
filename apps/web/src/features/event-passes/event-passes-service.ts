
import type { EventPassDto } from '@umsspira/shared-types';
import { apiClient } from '../../shared/services/api-client';

export async function getMyEventPasses(
  signal?: AbortSignal,
): Promise<EventPassDto[]> {
  return apiClient<EventPassDto[]>('/api/v1/registrations/my-passes', {
    method: 'GET',
    authenticated: true,
    cache: 'no-store',
    signal,
  });
}

export async function getMyEventPass(
  passId: string,
  signal?: AbortSignal,
): Promise<EventPassDto | null> {
  const passes = await getMyEventPasses(signal);
  if (!Array.isArray(passes)) {
    throw new Error('La respuesta del servidor no es válida.');
  }
  return passes.find((pass) => pass.id === passId) ?? null;
}
