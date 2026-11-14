import { authenticatedFetch } from '@/shared/services/auth-session';
import type { ManagedSurvey, SurveyFormValues } from '../types/survey-admin.types';

const BASE = '/api/v1/surveys/admin';

export const ALREADY_PUBLISHED_MESSAGE =
  'Ya existe una encuesta publicada y vigente para esta carrera';
const GENERIC_MESSAGE = 'No se pudo completar la acción. Inténtalo de nuevo.';

export class SurveyAdminError extends Error {}

function toText(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function mapSurvey(raw: unknown): ManagedSurvey {
  const item = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    id: String(item.id ?? ''),
    title: toText(item.title),
    startDate: toText(item.startDate),
    endDate: toText(item.endDate),
    status: toText(item.status),
  };
}

export function mapSurveyList(body: unknown): ManagedSurvey[] {
  const data =
    typeof body === 'object' && body !== null && 'data' in body
      ? (body as { data?: unknown }).data
      : undefined;
  return Array.isArray(data) ? data.map(mapSurvey) : [];
}

/**
 * Nombre de las carreras del administrador para el subtítulo («… de Ingeniería de Sistemas»).
 * Si algo falla devuelve null y la pantalla dice «de tu carrera»: el alcance real lo impone la T5.1.
 */
export async function loadCareerName(signal?: AbortSignal): Promise<string | null> {
  try {
    const me = await authenticatedFetch('/api/v1/auth/me', { cache: 'no-store', signal });
    if (!me.ok) return null;
    const ids = ((await me.json()) as { data?: { scopes?: { careerIds?: unknown } } }).data?.scopes
      ?.careerIds;
    if (!Array.isArray(ids) || ids.length === 0) return null;
    const careers = await authenticatedFetch('/api/v1/registrations/careers', {
      cache: 'no-store',
      signal,
    });
    if (!careers.ok) return null;
    const list = ((await careers.json()) as { data?: Array<{ id?: unknown; nombre?: unknown }> })
      .data;
    const names = (Array.isArray(list) ? list : [])
      .filter((career) => ids.includes(career.id) && typeof career.nombre === 'string')
      .map((career) => career.nombre as string);
    return names.length > 0 ? names.join(', ') : null;
  } catch {
    return null;
  }
}

/** '2026-01-15T00:00:00.000Z' -> '15/01/2026' (sin convertir zona horaria). */
export function formatDate(iso: string | null): string {
  const match = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '—';
}

/** '2026-01-15T00:00:00.000Z' -> '2026-01-15' (para el campo de fecha). */
export function toInputDate(iso: string | null): string {
  const match = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
}

async function request(path: string, init: RequestInit = {}): Promise<unknown> {
  const response = await authenticatedFetch(`${BASE}${path}`, {
    ...init,
    cache: 'no-store',
    headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    // CA-08: el backend responde con el código SURVEY_ALREADY_PUBLISHED.
    throw new SurveyAdminError(
      text.includes('SURVEY_ALREADY_PUBLISHED') ? ALREADY_PUBLISHED_MESSAGE : GENERIC_MESSAGE,
    );
  }
  return response.json();
}

export async function loadManagedSurveys(signal: AbortSignal): Promise<ManagedSurvey[]> {
  return mapSurveyList(await request('', { signal }));
}

// El backend toma la carrera de la sesión: nunca se envía careerId (CA-14).
function toBody(values: SurveyFormValues): string {
  return JSON.stringify({
    title: values.title.trim(),
    startDate: values.startDate,
    endDate: values.endDate,
  });
}

export function createSurvey(values: SurveyFormValues) {
  return request('', { method: 'POST', body: toBody(values) });
}

export function updateSurvey(id: string, values: SurveyFormValues) {
  return request(`/${id}`, { method: 'PATCH', body: toBody(values) });
}

export function publishSurvey(id: string) {
  return request(`/${id}/publish`, { method: 'POST' });
}

export function unpublishSurvey(id: string) {
  return request(`/${id}/unpublish`, { method: 'POST' });
}