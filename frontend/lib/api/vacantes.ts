export type VacancyRequirement = {
  id: string;
  nombre: string;
};

export type Vacancy = {
  id: string;
  idEmpresa: string;
  empresa: string;
  titulo: string;
  modalidad: string;
  estado: string;
  fechaCreacion: string | null;
  descripcion: string;
  ubicacion: string;
  area: string;
  condiciones: string;
  requisitos: VacancyRequirement[];
};

export type CreateVacancyInput = {
  idEmpresa: string;
  titulo: string;
  modalidad: string;
  descripcion: string;
  ubicacion: string;
  area: string;
  condiciones: string;
  requisitos: string[];
};

type ApiErrorBody = {
  message?: string | string[];
};

export const DEFAULT_API_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://backend-umsspira.vercel.app'
    : 'http://localhost:3001';

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL?.trim() || DEFAULT_API_URL
).replace(/\/$/, '');

export const configuredCompanyId =
  process.env.NEXT_PUBLIC_EMPRESA_ID?.trim() || 'demo-empresa-01';

export const configuredCompanyName =
  process.env.NEXT_PUBLIC_EMPRESA_NAME?.trim() || 'TecnoAndes S.R.L.';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
      cache: 'no-store',
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }

    throw new Error(
      'No se pudo conectar con el servicio de vacantes. Inténtalo nuevamente.',
    );
  }

  if (!response.ok) {
    let body: ApiErrorBody | null = null;

    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = null;
    }

    const message = Array.isArray(body?.message)
      ? body.message.join(' ')
      : body?.message;

    throw new Error(
      message || 'No se pudo completar la operación solicitada.',
    );
  }

  return (await response.json()) as T;
}

export function createVacancy(input: CreateVacancyInput) {
  return request<Vacancy>('/vacantes', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getVacancy(id: string) {
  return request<Vacancy>(`/vacantes/${encodeURIComponent(id)}`);
}

export function searchIndexedVacancies(query: string, signal?: AbortSignal) {
  const search = new URLSearchParams({ q: query.trim() });
  return request<Vacancy[]>(`/vacantes/buscar?${search.toString()}`, {
    signal,
  });
}

export function listVacancies(idEmpresa: string) {
  const query = new URLSearchParams({ idEmpresa });
  return request<Vacancy[]>(`/vacantes?${query.toString()}`);
}

export function isVacancyAvailable(status: string) {
  // Mapeo provisional para HU3; Equipo 4 definirá el catálogo oficial.
  return status.trim().toLowerCase() === 'disponible';
}

export function getVacancyIdentifier(vacancy: Pick<Vacancy, 'id'>) {
  // HU1/HU2 sustituirán este adaptador cuando exista un código oficial.
  return vacancy.id;
}
