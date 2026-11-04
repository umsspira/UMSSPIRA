import type { VacancyAffinityResponse } from '@umsspira/shared-types';

export class AffinityError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'AffinityError';
  }
}

export async function getVacancyAffinity(
  vacancyId: string,
  egresadoId: string,
  signal?: AbortSignal,
  simulateNlpFailure = false,
): Promise<VacancyAffinityResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/job-postings/${encodeURIComponent(vacancyId)}/afinidad`);
  url.searchParams.set('egresadoId', egresadoId);
  if (simulateNlpFailure) {
    url.searchParams.set('simulateNlpFailure', 'true');
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal,
    });
  } catch (error) {
    if ((error as DOMException)?.name === 'AbortError') {
      throw error;
    }
    throw new AffinityError(
      'No se pudo conectar con el servicio de afinidad. Verifica que el backend esté en ejecución.',
    );
  }

  if (!response.ok) {
    throw new AffinityError(
      `El servicio respondió con status ${response.status}`,
      response.status,
    );
  }

  return (await response.json()) as VacancyAffinityResponse;
}
