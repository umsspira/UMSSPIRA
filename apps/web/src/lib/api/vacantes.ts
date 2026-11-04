import { apiUrl } from '../../shared/services/api-contract';
import { authenticatedFetch } from '../../shared/services/auth-session';

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
  idEmpresa?: string;
  titulo: string;
  modalidad: string;
  descripcion: string;
  ubicacion: string;
  area: string;
  condiciones: string;
  requisitos: string[];
};

export type UpdateVacancyInput = Partial<
  Pick<Vacancy, 'titulo' | 'estado' | 'descripcion'>
>;

export type IndexVacancyResponse = {
  indexed: true;
  id: string;
  index: string;
};

type ApiErrorBody = {
  message?: string | string[];
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await authenticatedFetch(apiUrl(path), {
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
  return request<Vacancy>('/api/v1/vacantes', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getVacancy(id: string) {
  return request<Vacancy>(`/api/v1/vacantes/${encodeURIComponent(id)}`);
}

export function updateVacancy(id: string, input: UpdateVacancyInput) {
  return request<Vacancy>(`/api/v1/vacantes/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function indexVacancy(id: string) {
  return request<IndexVacancyResponse>(
    `/api/v1/vacantes/${encodeURIComponent(id)}/indexar`,
    { method: 'POST' },
  );
}

export function searchIndexedVacancies(query: string, signal?: AbortSignal) {
  const search = new URLSearchParams({ q: query.trim() });
  return request<Vacancy[]>(`/api/v1/vacantes/buscar?${search.toString()}`, {
    signal,
  });
}

export function listVacancies() {
  return request<Vacancy[]>('/api/v1/vacantes/mis-vacantes');
}

export function isVacancyAvailable(status: string) {
  return ['publicada', 'publicado', 'publicada y vigente', 'vigente', 'abierta', 'activo', 'activa', 'published', 'open', 'disponible']
    .includes(status.trim().toLocaleLowerCase());
}

export function getVacancyIdentifier(vacancy: Pick<Vacancy, 'id'>) {
  // HU1/HU2 sustituirán este adaptador cuando exista un código oficial.
  return vacancy.id;
}
