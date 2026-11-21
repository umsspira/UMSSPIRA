import {
  authenticatedFetch,
  clearAccessToken,
  ensureAccessToken,
  getAccessToken,
  SessionError,
} from '@/shared/services/auth-session';
import { readApiError } from '@/shared/services/api-contract';

export type MyRequestStatus = 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO' | 'CANCELADO';
export type MyRequestFilter = 'TODAS' | MyRequestStatus;

export interface MyRequestMentor {
  id: string;
  nombre: string | null;
  cargo: string | null;
  empresa: string | null;
}

export interface MyRequest {
  id: string;
  mentor: MyRequestMentor;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  mensaje: string | null;
  estado: MyRequestStatus;
  fecha_creacion: string | null;
  fecha_respuesta: string | null;
  fecha_actualizacion: string | null;
}

export type MyRequestCounts = Record<MyRequestFilter, number>;

export interface MyRequestPage {
  items: MyRequest[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  counts: MyRequestCounts;
}

export class MyRequestsError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'MyRequestsError';
  }
}

const STATUSES: readonly MyRequestStatus[] = [
  'PENDIENTE',
  'ACEPTADO',
  'RECHAZADO',
  'CANCELADO',
];

function isMentor(value: unknown): value is MyRequestMentor {
  if (!value || typeof value !== 'object') return false;
  const mentor = value as Partial<MyRequestMentor>;
  return typeof mentor.id === 'string';
}

function isMyRequest(value: unknown): value is MyRequest {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<MyRequest>;
  return (
    typeof item.id === 'string' &&
    isMentor(item.mentor) &&
    typeof item.fecha === 'string' &&
    typeof item.hora_inicio === 'string' &&
    typeof item.hora_fin === 'string' &&
    STATUSES.includes(item.estado as MyRequestStatus)
  );
}

function readCounts(value: unknown): MyRequestCounts {
  const counts = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const number = (key: string) => (typeof counts[key] === 'number' ? (counts[key] as number) : 0);
  return {
    TODAS: number('TODAS'),
    PENDIENTE: number('PENDIENTE'),
    ACEPTADO: number('ACEPTADO'),
    RECHAZADO: number('RECHAZADO'),
    CANCELADO: number('CANCELADO'),
  };
}

async function request<T>(
  path: string,
  init: RequestInit,
  parse: (data: unknown) => T,
): Promise<T> {
  let token: string;
  try {
    token = getAccessToken() ?? (await ensureAccessToken());
  } catch (error) {
    if (error instanceof SessionError) throw new MyRequestsError(error.message, error.status);
    throw new MyRequestsError('Inicia sesión para consultar tus solicitudes.', 401);
  }

  let response: Response;
  const controller = new AbortController();
  const relayAbort = () => controller.abort();
  init.signal?.addEventListener('abort', relayAbort, { once: true });
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    response = await authenticatedFetch(path, {
      ...init,
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new MyRequestsError(
      controller.signal.aborted && !init.signal?.aborted
        ? 'La solicitud tardó demasiado. Intenta nuevamente.'
        : 'No se pudo conectar con el servidor. Intenta nuevamente.',
      0,
    );
  } finally {
    clearTimeout(timeout);
    init.signal?.removeEventListener('abort', relayAbort);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    if (response.status === 401 && getAccessToken() === token) clearAccessToken();
    const apiError = readApiError(body, 'No se pudo cargar la solicitud.');
    throw new MyRequestsError(apiError.message, response.status, apiError.code);
  }

  try {
    return parse(body);
  } catch {
    throw new MyRequestsError('El servidor devolvió una solicitud con formato inválido.', 502);
  }
}

export function listMyRequests(
  filters: { status?: MyRequestStatus; page?: number; pageSize?: number } = {},
  signal?: AbortSignal,
): Promise<MyRequestPage> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (filters.status) query.set('estado', filters.status);

  return request(`/api/v1/mentorship/my-requests?${query}`, { method: 'GET', signal }, (data) => {
    if (!data || typeof data !== 'object') throw new Error('invalid response');
    const envelope = data as {
      data?: unknown;
      pagination?: Partial<MyRequestPage>;
      counts?: unknown;
    };
    if (!Array.isArray(envelope.data)) throw new Error('invalid items');
    const items = envelope.data.filter(isMyRequest);
    if (items.length !== envelope.data.length) throw new Error('invalid items');
    const pagination = envelope.pagination ?? {};
    return {
      items,
      page: pagination.page ?? page,
      pageSize: pagination.pageSize ?? pageSize,
      total: pagination.total ?? items.length,
      totalPages: pagination.totalPages ?? 1,
      counts: readCounts(envelope.counts),
    };
  });
}

export function cancelMyRequest(id: string, signal?: AbortSignal): Promise<MyRequest> {
  return request(
    `/api/v1/mentorship/my-requests/${encodeURIComponent(id)}/cancel`,
    { method: 'PATCH', signal },
    (data) => {
      const item =
        data && typeof data === 'object' && 'data' in data
          ? (data as { data: unknown }).data
          : data;
      if (!isMyRequest(item)) throw new Error('invalid request');
      return item;
    },
  );
}
