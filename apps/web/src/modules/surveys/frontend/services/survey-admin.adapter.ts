import { authenticatedFetch } from '@/shared/services/auth-session';
import type { AdminCareer, ManagedSurvey, SurveyFormValues } from '../types/survey-admin.types';

const BASE = '/api/v1/surveys/admin';

export const ALREADY_PUBLISHED_MESSAGE =
  'Ya existe una encuesta publicada y vigente para esta carrera';
export const CAREER_REQUIRED_MESSAGE = 'Seleccione la carrera de la encuesta';
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
    careerId: toText(item.careerId),
  };
}

export function mapSurveyList(body: unknown): ManagedSurvey[] {
  const data =
    typeof body === 'object' && body !== null && 'data' in body
      ? (body as { data?: unknown }).data
      : undefined;
  return Array.isArray(data) ? data.map(mapSurvey) : [];
}

/** «Lic. en Ingeniería de Sistemas» -> «Ingeniería de Sistemas», como en el mock-up 15. */
export function displayCareerName(name: string): string {
  return name.replace(/^lic(enciatura)?\.?\s+en\s+/i, '').trim();
}

/** «A», «A y B», «A, B y C»; «e» antes de un nombre que suena «i» (Ingeniería, Informática). */
export function joinCareerNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  const last = names[names.length - 1];
  const connector = /^h?[ií](?![aeou])/i.test(last) ? ' e ' : ' y ';
  return names.slice(0, -1).join(', ') + connector + last;
}

/**
 * Carreras del administrador, para el subtítulo, el campo «Carrera» y la columna de la lista.
 * Si algo falla devuelve una lista vacía y la pantalla dice «de tu carrera»: el alcance real lo impone la T5.1.
 */
export async function loadAdminCareers(signal?: AbortSignal): Promise<AdminCareer[]> {
  try {
    const me = await authenticatedFetch('/api/v1/auth/me', { cache: 'no-store', signal });
    if (!me.ok) return [];
    const ids = ((await me.json()) as { data?: { scopes?: { careerIds?: unknown } } }).data?.scopes
      ?.careerIds;
    if (!Array.isArray(ids) || ids.length === 0) return [];
    const careers = await authenticatedFetch('/api/v1/registrations/careers', {
      cache: 'no-store',
      signal,
    });
    if (!careers.ok) return [];
    const list = ((await careers.json()) as { data?: Array<{ id?: unknown; nombre?: unknown }> })
      .data;
    return (Array.isArray(list) ? list : [])
      .filter(
        (career): career is { id: string; nombre: string } =>
          typeof career.id === 'string' && ids.includes(career.id) && typeof career.nombre === 'string',
      )
      .map((career) => ({ id: career.id, name: displayCareerName(career.nombre) }));
  } catch {
    return [];
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
    if (text.includes('SURVEY_ALREADY_PUBLISHED')) throw new SurveyAdminError(ALREADY_PUBLISHED_MESSAGE);
    if (text.includes('SURVEY_CAREER_REQUIRED')) throw new SurveyAdminError(CAREER_REQUIRED_MESSAGE);
    throw new SurveyAdminError(GENERIC_MESSAGE);
  }
  return response.json();
}

export async function loadManagedSurveys(signal: AbortSignal): Promise<ManagedSurvey[]> {
  return mapSurveyList(await request('', { signal }));
}

function toPayload(values: SurveyFormValues) {
  return {
    title: values.title.trim(),
    startDate: values.startDate,
    endDate: values.endDate,
  };
}

// La carrera solo se envía al crear y si el administrador eligió una; el backend valida que sea suya (CA-14).
export function toCreateBody(values: SurveyFormValues): string {
  return JSON.stringify({
    ...toPayload(values),
    ...(values.careerId ? { careerId: values.careerId } : {}),
  });
}

export function createSurvey(values: SurveyFormValues) {
  return request('', { method: 'POST', body: toCreateBody(values) });
}

// La carrera de una encuesta no cambia al editarla.
export function updateSurvey(id: string, values: SurveyFormValues) {
  return request(`/${id}`, { method: 'PATCH', body: JSON.stringify(toPayload(values)) });
}

export function publishSurvey(id: string) {
  return request(`/${id}/publish`, { method: 'POST' });
}

export function unpublishSurvey(id: string) {
  return request(`/${id}/unpublish`, { method: 'POST' });
}