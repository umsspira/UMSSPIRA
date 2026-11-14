import {
  NIVELES_ESPERADOS,
  TIPOS_REQUISITO,
  type RequisitoTecnico,
} from '@/lib/vacancies/contracts';
import { apiClient, ApiClientError } from './api-client';
import { SessionError } from './auth-session';

type ErrorKind = 'http' | 'connection' | 'invalid-response';

export class TechnicalRequirementsError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly kind: ErrorKind = status === undefined ? 'connection' : 'http',
  ) {
    super(message);
    this.name = 'TechnicalRequirementsError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

// Adapted from HU8: validate both the response contract and the vacancy association.
function isRequirementsResponse(
  value: unknown,
  vacancyId: string,
): value is { idVacante: string; requisitos: RequisitoTecnico[] } {
  if (
    !isRecord(value) || !isUuid(value.idVacante) ||
    value.idVacante.toLowerCase() !== vacancyId.toLowerCase() ||
    !Array.isArray(value.requisitos)
  ) return false;

  return value.requisitos.every((item: unknown) => {
    if (!isRecord(item)) return false;
    return (
      isUuid(item.id) && isUuid(item.idVacante) &&
      item.idVacante.toLowerCase() === vacancyId.toLowerCase() &&
      typeof item.competencia === 'string' && item.competencia.trim().length > 0 &&
      NIVELES_ESPERADOS.some((nivel) => nivel === item.nivel) &&
      TIPOS_REQUISITO.some((tipo) => tipo === item.tipo) &&
      (item.descripcion === undefined || typeof item.descripcion === 'string') &&
      (item.fechaCreacion === undefined ||
        (typeof item.fechaCreacion === 'string' && Number.isFinite(Date.parse(item.fechaCreacion))))
    );
  });
}

function httpMessage(status: number): string {
  switch (status) {
    case 400: return 'El identificador de la vacante no es válido.';
    case 401: return 'Tu sesión no está disponible o expiró. Inicia sesión para consultar los requisitos.';
    case 403: return 'No tienes permiso para consultar los requisitos de esta vacante.';
    case 404: return 'Esta vacante ya no está disponible para consultar sus requisitos.';
    case 429: return 'Se realizaron demasiadas consultas. Espera unos momentos e intenta nuevamente.';
    default: return status >= 500
      ? 'El servidor no pudo consultar los requisitos. Intenta nuevamente en unos momentos.'
      : 'No se pudieron consultar los requisitos de esta vacante.';
  }
}

export async function getTechnicalVacancyRequirements(
  vacancyId: string,
  signal?: AbortSignal,
): Promise<RequisitoTecnico[]> {
  signal?.throwIfAborted();
  const id = vacancyId.trim();
  if (!isUuid(id)) {
    throw new TechnicalRequirementsError(httpMessage(400), 400);
  }

  try {
    // apiFetch unwraps `data`; this endpoint deliberately returns HU8's raw contract.
    const data = await apiClient<unknown>(
      `/api/v1/job-postings/${encodeURIComponent(id)}/requisitos`,
      { method: 'GET', authenticated: true, credentials: 'same-origin', cache: 'no-store', signal },
    );
    signal?.throwIfAborted();

    if (
      !isRequirementsResponse(data, id) ||
      new Set(data.requisitos.map((item) => item.id.toLowerCase())).size !== data.requisitos.length
    ) {
      throw new TechnicalRequirementsError(
        'No se pudo verificar la respuesta de requisitos técnicos. Intenta nuevamente.',
        undefined,
        'invalid-response',
      );
    }
    return data.requisitos;
  } catch (error: unknown) {
    signal?.throwIfAborted();
    if (error instanceof TechnicalRequirementsError) throw error;
    if (error instanceof ApiClientError && error.code === 'BACKEND_UNAVAILABLE') {
      throw new TechnicalRequirementsError(
        'No fue posible conectar con el servidor de requisitos. Intenta nuevamente.',
        error.status,
        'connection',
      );
    }
    if (error instanceof ApiClientError || error instanceof SessionError) {
      throw new TechnicalRequirementsError(httpMessage(error.status), error.status);
    }
    throw new TechnicalRequirementsError(
      'No fue posible conectar con el servidor de requisitos. Intenta nuevamente.',
    );
  }
}
