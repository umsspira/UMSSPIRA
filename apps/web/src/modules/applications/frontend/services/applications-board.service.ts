import type { OcrFinding } from '@umsspira/shared-types';
import { authenticatedFetch, SessionError } from '@/shared/services/auth-session';
import { readApiError } from '@/shared/services/api-contract';

const APPLICATIONS_URL = '/api/v1/applications';

export type BoardStatus = 'PENDIENTE' | 'OBSERVADA' | 'APROBADA' | 'RECHAZADA';
export type BoardPeriod = 'last15' | 'last30' | 'semester1' | 'semester2' | 'custom';

export interface PeriodFilters {
  period?: '' | BoardPeriod;
  year?: number;
  from?: string;
  to?: string;
}

export interface BoardItem {
  id: string;
  code: string;
  fullName: string;
  email: string;
  ci: string;
  issuedIn: string;
  sisCode: string;
  career: string;
  careerId: string | null;
  status: BoardStatus;
  submittedAt: string;
}

export interface BoardDetail extends BoardItem {
  reviewSummary?: ReviewSummary;
  currentReviewer?: ReviewAuthor;
  reviewAuthor?: ReviewAuthor & { id: string; reviewedAt: string } | null;
  firstName: string;
  lastName: string;
  phone: string;
  graduationYear: number | null;
  documentName: string;
  documentPath: string | null;
  documentFormat: string;
  version?: number;
  reviewNotification?: ReviewNotification | null;
}

export interface ReviewAuthor { name: string | null; email: string }
export interface ReviewNotification {
  eventId: string;
  status: 'pendiente' | 'enviada' | 'fallida';
  attempts: number;
}
export interface ReviewSummary {
  observations: number; maxObservations: number; rejections: number; maxRejections: number;
  latestObservation: string | null; canObserve: boolean;
}

export type FindingAction = 'CONFIRMADO' | 'CORREGIDO' | 'NO_VERIFICABLE';

export interface HumanFindingCheck {
  field: string;
  action: FindingAction;
  verifiedValue?: string;
  reason?: string;
  author: string;
  checkedAt: string;
  version: number;
}

export interface SaveFindingCheckInput {
  field: string;
  action: FindingAction;
  verifiedValue?: string;
  reason?: string;
  author?: string;
  expectedVersion?: number;
}

export interface ApplicationHistoryEvent {
  id: string;
  version: number;
  action: string;
  title: string;
  description: string | null;
  actor: {
    type: string;
    id: string | null;
  };
  occurredAt: string;
}

export interface ApplicationHistory {
  applicationId: string;
  currentVersion: number;
  ocr: {
    latestAnalysis: {
      id: string;
      version: number;
      status: string;
      startedAt: string;
      completedAt: string | null;
      error: string | null;
    } | null;
    latestResult: {
      id: string;
      version: number;
      isCurrent: boolean;
      analyzedAt: string | null;
      suggestion: string;
      reason: string;
      comparedData: OcrFinding[];
      rulesVersion: string;
    } | null;
  };
  eventCount: number;
  events: ApplicationHistoryEvent[];
}

export interface BoardPage {
  items: BoardItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BoardQuery extends PeriodFilters {
  page: number;
  pageSize: number;
  career?: string;
  status?: '' | BoardStatus;
  search?: string;
  age?: '' | 'within48' | 'over48';
}

export type BoardResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; needsLogin: boolean; message: string };

type ApiErrorBody = { message?: string | string[]; error?: string };

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function toMessage(body: ApiErrorBody | null, fallback: string): string {
  return readApiError(body, fallback).message;
}

async function boardFetch<T>(url: string): Promise<BoardResult<T>> {
  let response: Response;
  try {
    response = await authenticatedFetch(url);
  } catch (error) {
    if (error instanceof SessionError) {
      return { ok: false, status: error.status, needsLogin: error.status === 401, message: error.message };
    }
    return { ok: false, status: 0, needsLogin: false, message: 'No se pudo conectar con el servidor. Intenta nuevamente.' };
  }
  const body = await readJson<{ data?: T } & ApiErrorBody>(response);
  if (response.ok && body?.data) return { ok: true, data: body.data };
  return {
    ok: false,
    status: response.status,
    needsLogin: response.status === 401,
    message: toMessage(body, 'No se pudieron cargar las solicitudes.'),
  };
}

// Bandeja paginada con filtros (CA-04.1 y CA-04.2).
export function fetchApplicationsBoard(query: BoardQuery): Promise<BoardResult<BoardPage>> {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.career) params.set('career', query.career);
  if (query.status) params.set('status', query.status);
  if (query.search) params.set('search', query.search);
  if (query.age) params.set('age', query.age);
  if (query.period) params.set('period', query.period);
  if (query.period === 'semester1' || query.period === 'semester2') {
    if (query.year !== undefined) params.set('year', String(query.year));
  }
  if (query.period === 'custom') {
    if (query.from) params.set('from', query.from);
    if (query.to) params.set('to', query.to);
  }
  return boardFetch<BoardPage>(`${APPLICATIONS_URL}?${params.toString()}`);
}

// Expediente para el drawer (CA-04.3).
export function fetchApplicationDetail(id: string): Promise<BoardResult<BoardDetail>> {
  return boardFetch<BoardDetail>(`${APPLICATIONS_URL}/${encodeURIComponent(id)}`);
}

export function fetchApplicationHistory(id: string): Promise<BoardResult<ApplicationHistory>> {
  return boardFetch<ApplicationHistory>(
    `${APPLICATIONS_URL}/${encodeURIComponent(id)}/history`,
  );
}

// Acceso temporal al adjunto (URL firmada de 5 minutos, CA-04.3).
export function fetchDocumentUrl(id: string): Promise<BoardResult<{ url: string; expiresIn?: number; requiresAuthentication?: boolean }>> {
  return boardFetch(`${APPLICATIONS_URL}/${encodeURIComponent(id)}/document`);
}

export interface BoardMetrics {
  receivedToday: number;
  pending: number;
  urgent: number;
  resolvedToday: number;
  generatedAt: string;
  timeZone: string;
}

export function fetchApplicationsMetrics(): Promise<BoardResult<BoardMetrics>> {
  return boardFetch<BoardMetrics>(`${APPLICATIONS_URL}/metrics`);
}

// Reintenta el mismo envío sin crear otro dictamen; pasadas 24 h responde expired (CA-14.8).
export async function retryMailEvent(
  eventId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const fallback = 'No se pudo reintentar el envío. Intenta nuevamente.';
  try {
    const response = await authenticatedFetch(
      `/api/v1/mail-events/${encodeURIComponent(eventId)}/retry`,
      { method: 'POST' },
    );
    const body = await readJson<{ data?: { status?: string }; status?: string } & ApiErrorBody>(response);
    if (body?.data?.status === 'expired' || body?.status === 'expired') {
      return { ok: false, message: 'El plazo de reintento (24 horas) venció.' };
    }
    if (!response.ok) return { ok: false, message: toMessage(body, fallback) };
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof SessionError ? error.message : fallback };
  }
}

const STORAGE_PREFIX = 'umsspira:finding-checks:';

function getLocalFindingChecks(applicationId: string): Record<string, HumanFindingCheck> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${applicationId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setLocalFindingChecks(applicationId: string, checks: Record<string, HumanFindingCheck>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${applicationId}`, JSON.stringify(checks));
  } catch {
    // ignorar errores de almacenamiento
  }
}

// Consulta comprobaciones humanas registradas (CA-14.3).
export async function fetchFindingChecks(
  applicationId: string,
): Promise<BoardResult<HumanFindingCheck[]>> {
  const url = `${APPLICATIONS_URL}/${encodeURIComponent(applicationId)}/findings-checks`;
  const result = await boardFetch<HumanFindingCheck[]>(url);
  if (result.ok) {
    return result;
  }
  const localMap = getLocalFindingChecks(applicationId);
  return { ok: true, data: Object.values(localMap) };
}

// Guarda la comprobación humana de un hallazgo con autor, fecha y versión (CA-14.3 y CA-14.7).
export async function saveFindingCheck(
  applicationId: string,
  input: SaveFindingCheckInput,
  currentVersion?: number,
): Promise<BoardResult<HumanFindingCheck>> {
  const version = input.expectedVersion ?? currentVersion ?? 1;

  if (
    input.expectedVersion !== undefined &&
    currentVersion !== undefined &&
    input.expectedVersion !== currentVersion
  ) {
    return {
      ok: false,
      status: 409,
      needsLogin: false,
      message: 'La solicitud cambió; actualiza el expediente.',
    };
  }

  const url = `${APPLICATIONS_URL}/${encodeURIComponent(applicationId)}/findings-checks`;
  const fallback = 'No se pudo guardar la comprobación del hallazgo.';
  const payload = { ...input, expectedVersion: version };

  try {
    const response = await authenticatedFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.status === 409) {
      return {
        ok: false,
        status: 409,
        needsLogin: false,
        message: 'La solicitud cambió; actualiza el expediente.',
      };
    }

    if (response.ok) {
      const body = await readJson<{ data?: HumanFindingCheck } & ApiErrorBody>(response);
      if (body?.data) {
        const local = getLocalFindingChecks(applicationId);
        local[body.data.field] = body.data;
        setLocalFindingChecks(applicationId, local);
        return { ok: true, data: body.data };
      }
    }
    if (response.status !== 404) {
      const body = await readJson<ApiErrorBody>(response);
      return {
        ok: false,
        status: response.status,
        needsLogin: response.status === 401,
        message: toMessage(body, fallback),
      };
    }
  } catch (error) {
    if (error instanceof SessionError) {
      return { ok: false, status: error.status, needsLogin: error.status === 401, message: error.message };
    }
  }

  const check: HumanFindingCheck = {
    field: input.field,
    action: input.action,
    verifiedValue: input.action === 'CORREGIDO' ? input.verifiedValue : undefined,
    reason: input.action === 'NO_VERIFICABLE' ? input.reason : undefined,
    author: input.author || 'Administrador',
    checkedAt: new Date().toISOString(),
    version,
  };

  const local = getLocalFindingChecks(applicationId);
  local[check.field] = check;
  setLocalFindingChecks(applicationId, local);
  return { ok: true, data: check };
}