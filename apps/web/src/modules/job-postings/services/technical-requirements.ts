import type { TechnicalVacancyRequirement } from '@umsspira/shared-types';

type TechnicalRequirementsResponse = {
  idVacante: string;
  requisitos: TechnicalVacancyRequirement[];
};

export class TechnicalRequirementsError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'TechnicalRequirementsError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isRequirementsResponse(
  value: unknown,
  vacancyId: string,
): value is TechnicalRequirementsResponse {
  if (
    !isRecord(value) ||
    typeof value.idVacante !== 'string' ||
    value.idVacante.toLowerCase() !== vacancyId.toLowerCase() ||
    !Array.isArray(value.requisitos)
  ) {
    return false;
  }

  return value.requisitos.every((item: unknown) => {
    if (!isRecord(item)) return false;

    return (
      ['id', 'idVacante', 'competencia', 'nivel', 'tipo'].every(
        (field) => typeof item[field] === 'string' && item[field].trim().length > 0,
      ) &&
      typeof item.idVacante === 'string' &&
      item.idVacante.toLowerCase() === vacancyId.toLowerCase() &&
      (item.descripcion === undefined ||
        item.descripcion === null ||
        typeof item.descripcion === 'string') &&
      (item.fechaCreacion === undefined || typeof item.fechaCreacion === 'string')
    );
  });
}

function httpErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return 'El identificador de la vacante no es válido. Revisa el ID e intenta nuevamente.';
    case 401:
    case 403:
      return 'No tienes permiso para consultar los requisitos técnicos de esta vacante.';
    case 404:
      return 'No se encontró la ruta o el recurso solicitado. No se pudo confirmar si la vacante existe.';
    case 429:
      return 'Se realizaron demasiadas consultas. Espera un momento e intenta nuevamente.';
    case 503:
      return 'El servicio no está disponible. Verifica la disponibilidad del backend y su configuración de Supabase.';
    default:
      return status >= 500
        ? 'El servidor no pudo consultar los requisitos técnicos. Intenta nuevamente.'
        : 'No se pudieron consultar los requisitos técnicos. Intenta nuevamente.';
  }
}

/** HU8 uses only the official API; failures never fall back to simulated data. */
export async function getTechnicalVacancyRequirements(
  vacancyId: string,
  signal?: AbortSignal,
): Promise<TechnicalVacancyRequirement[]> {
  const id = vacancyId.trim();
  if (!id) throw new TechnicalRequirementsError('Ingresa el ID de una vacante.');

  signal?.throwIfAborted();
  const apiUrl = (
    process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://localhost:3000'
  ).replace(/\/+$/, '');
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 15_000);

  try {
    const response = await fetch(
      `${apiUrl}/job-postings/${encodeURIComponent(id)}/requisitos`,
      { signal: controller.signal, cache: 'no-store' },
    );

    if (!response.ok) {
      throw new TechnicalRequirementsError(
        httpErrorMessage(response.status),
        response.status,
      );
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new TechnicalRequirementsError('El servicio devolvió una respuesta no válida. Intenta nuevamente.');
    }

    if (!isRequirementsResponse(data, id)) {
      throw new TechnicalRequirementsError('No se pudieron verificar los requisitos técnicos de esta vacante.');
    }

    return data.requisitos;
  } catch (error: unknown) {
    signal?.throwIfAborted();
    if (timedOut) {
      throw new TechnicalRequirementsError('Se agotó el tiempo de espera al consultar los requisitos técnicos. Intenta nuevamente.');
    }
    if (error instanceof TechnicalRequirementsError) throw error;
    throw new TechnicalRequirementsError('No se pudo conectar con el servidor. Verifica que el backend esté funcionando.');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
