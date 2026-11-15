import { clearAccessToken, getAccessToken } from '@/shared/services/auth-session';
import { authenticatedFetch, ensureAccessToken } from '@/shared/services/auth-session';
import { readApiError } from '@/shared/services/api-contract';
import { normalizeInterests, type InterestArea, type InterestConfiguration } from '../model/mentor-interests';

const BASE = '/api/v1/mentorship/interests';

export interface MentorInterestsState {
  catalog: InterestArea[];
  configuration: InterestConfiguration;
  customInterestsAvailable?: boolean;
}

export class MentorInterestsError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

async function request(path: string, options: RequestInit): Promise<unknown> {
  const token = getAccessToken() ?? await ensureAccessToken();
  if (!token) throw new MentorInterestsError('Inicia sesión para configurar tus intereses.', 401);
  const response = await authenticatedFetch(path, {
    ...options,
    credentials: 'omit',
    cache: 'no-store',
    headers: { Accept: 'application/json', ...options.headers, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    if (response.status === 401 && getAccessToken() === token) clearAccessToken();
    let message = '';
    try {
      const body = await response.json();
      if (body?.error) message = readApiError(body, '').message;
      else if (typeof body?.message === 'string') message = body.message;
      else if (Array.isArray(body?.message)) message = body.message.filter((item: unknown) => typeof item === 'string').join(' ');
    } catch { /* La respuesta de error puede no ser JSON. */ }
    const messages: Record<number, string> = {
      401: 'Inicia sesión para configurar tus intereses.',
      403: 'No tienes permiso para configurar estos intereses.',
      409: 'La selección cambió. Vuelve a intentar guardar para actualizarla.',
    };
    throw new MentorInterestsError(messages[response.status] || message || `No se pudieron procesar los intereses (HTTP ${response.status}).`, response.status);
  }
  return (await response.json()).data;
}

interface ApiArea {
  id: string;
  nombre: string;
  descripcion?: string | null;
  seleccionada?: boolean;
  bloqueada?: boolean;
}
interface ApiInterest { id: string; nombre: string; area: ApiArea; es_personalizado?: boolean }

function isArea(value: unknown): value is ApiArea {
  return !!value && typeof value === 'object' && 'id' in value && typeof value.id === 'string'
    && 'nombre' in value && typeof value.nombre === 'string';
}

function isInterest(value: unknown): value is ApiInterest {
  return isArea(value) && 'area' in value && isArea(value.area);
}

export async function getMentorInterests(signal?: AbortSignal): Promise<MentorInterestsState> {
  const [groups, interests] = await Promise.all([
    request(`${BASE}/catalog`, { method: 'GET', signal }),
    request(`${BASE}/mine`, { method: 'GET', signal }),
  ]);
  if (!Array.isArray(groups) || !Array.isArray(interests) || !interests.every(isInterest)) {
    throw new Error('El backend devolvió los intereses con un formato inválido.');
  }
  const catalog: InterestArea[] = groups.map((group: unknown) => {
    if (!group || typeof group !== 'object' || !('area' in group) || !isArea(group.area)
      || !('intereses' in group) || !Array.isArray(group.intereses)) {
      throw new Error('El backend devolvió el catálogo de intereses con un formato inválido.');
    }
    const area = group.area as ApiArea;
    if (!group.intereses.every((item: unknown) => isInterest(item) && item.area.id === area.id)) {
      throw new Error('El backend devolvió tópicos que no corresponden a su área.');
    }
    return {
      id: area.id,
      name: area.nombre,
      description: area.descripcion ?? '',
      locked: area.bloqueada === true,
      topics: group.intereses.map(item => ({
        id: item.id,
        name: item.nombre,
        ...(item.es_personalizado ? { isCustom: true } : {}),
      })),
    };
  });
  // El catálogo ahora incluye todas las áreas raíz. Solo las marcadas como
  // `seleccionada` cuentan como áreas del perfil; si el backend no envía el
  // campo (versión anterior), se conserva el comportamiento previo.
  const legacyCatalog = groups.every((group: { area: ApiArea }) => typeof group.area.seleccionada !== 'boolean');
  const areaIds = legacyCatalog
    ? catalog.map(area => area.id)
    : groups
        .filter((group: { area: ApiArea }) => group.area.seleccionada === true)
        .map((group: { area: ApiArea }) => group.area.id);
  return {
    catalog,
    customInterestsAvailable: !groups.some((group: { personalizados_disponibles?: boolean }) =>
      group.personalizados_disponibles === false),
    configuration: normalizeInterests(catalog, {
      areaIds,
      topicIds: interests.map(item => item.id),
    }),
  };
}

interface ApiSavedInterest extends ApiInterest {
  id_area: string;
}

function isSavedInterest(value: unknown): value is ApiSavedInterest {
  if (!value || typeof value !== 'object') return false;
  const item = value as { id?: unknown; nombre?: unknown; id_area?: unknown };
  return typeof item.id === 'string' && typeof item.nombre === 'string' && typeof item.id_area === 'string';
}

function isSavedInterests(value: unknown): value is {
  areas: ApiArea[];
  selectedIds: string[];
  intereses: ApiSavedInterest[];
} {
  if (!value || typeof value !== 'object') return false;
  const data = value as { areas?: unknown; selectedIds?: unknown; intereses?: unknown };
  return Array.isArray(data.areas) && data.areas.every(isArea)
    && Array.isArray(data.selectedIds) && data.selectedIds.every(id => typeof id === 'string')
    && Array.isArray(data.intereses) && data.intereses.every(isSavedInterest);
}

export async function saveMentorInterests(configuration: InterestConfiguration): Promise<InterestConfiguration> {
  if (!configuration.areaIds.length) {
    throw new Error('Debes conservar al menos un área técnica.');
  }
  // HU 6.21: una sola operación atómica. El backend valida áreas, tópicos
  // sugeridos e intereses personalizados, y devuelve el estado persistido.
  const data = await request(BASE, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ areaIds: configuration.areaIds, topicIds: configuration.topicIds }),
  });
  if (!isSavedInterests(data)) {
    throw new Error('El backend devolvió los intereses con un formato inválido.');
  }
  return {
    areaIds: data.selectedIds,
    topicIds: data.intereses.map(item => item.id),
  };
}

export interface CustomInterestApiResult {
  id: string;
  nombre: string;
  area: ApiArea;
  es_personalizado?: boolean;
  coincidencia_sugerido?: boolean;
  mensaje?: string;
}

export async function createCustomInterestApi(areaId: string, texto: string): Promise<CustomInterestApiResult> {
  return request(`${BASE}/custom`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ areaId, texto }),
  }) as Promise<CustomInterestApiResult>;
}

export async function updateCustomInterestApi(id: string, texto: string): Promise<{ id: string; nombre: string; area: ApiArea; es_personalizado?: boolean }> {
  return request(`${BASE}/custom/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texto }),
  }) as Promise<{ id: string; nombre: string; area: ApiArea; es_personalizado?: boolean }>;
}

export async function deleteCustomInterestApi(id: string): Promise<{ id: string; eliminado: boolean; mensaje?: string }> {
  return request(`${BASE}/custom/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }) as Promise<{ id: string; eliminado: boolean; mensaje?: string }>;
}

