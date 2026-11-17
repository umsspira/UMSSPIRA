import type {
  MentorOnboardingAreaDto,
  MentorOnboardingAvailabilityStatus,
  MentorOnboardingInterestDto,
  MentorOnboardingInterestGroupDto,
  MentorOnboardingResponse,
  MentorOnboardingScheduleDto,
  MentorOnboardingStepDto,
  MentorOnboardingStepKey,
} from '@umsspira/shared-types';
import { clearAccessToken, getAccessToken } from '@/shared/services/auth-session';
import { authenticatedFetch, ensureAccessToken } from '@/shared/services/auth-session';

const BASE = '/api/v1/mentorship/onboarding';

export type OnboardingAvailabilityStatus = MentorOnboardingAvailabilityStatus;
export type OnboardingStepKey = MentorOnboardingStepKey;
export type OnboardingSchedule = MentorOnboardingScheduleDto;
export type OnboardingStep = MentorOnboardingStepDto;
export type OnboardingArea = MentorOnboardingAreaDto;
export type OnboardingInterest = MentorOnboardingInterestDto;
export type OnboardingInterestGroup = MentorOnboardingInterestGroupDto;
export type MentorOnboardingState = MentorOnboardingResponse;

export const onboardingAvailabilityStatuses = [
  'DISPONIBLE',
  'EN_PAUSA',
  'NO_DISPONIBLE',
] as const satisfies readonly OnboardingAvailabilityStatus[];

export class MentorOnboardingError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code = '',
    public readonly fields: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = 'MentorOnboardingError';
  }
}

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`El servidor devolvió ${field} con un formato inválido.`);
  }
  return value;
}

function readBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`El servidor devolvió ${field} con un formato inválido.`);
  }
  return value;
}

function readStep(value: unknown): 1 | 2 | 3 {
  if (value !== 1 && value !== 2 && value !== 3) {
    throw new Error('El servidor devolvió un paso de configuración inválido.');
  }
  return value;
}

function readStatus(value: unknown): OnboardingAvailabilityStatus | null {
  if (value === null) return null;
  if (
    typeof value === 'string' &&
    onboardingAvailabilityStatuses.includes(value as OnboardingAvailabilityStatus)
  ) {
    return value as OnboardingAvailabilityStatus;
  }
  throw new Error('El servidor devolvió un estado de disponibilidad inválido.');
}

function readFields(value: unknown): Record<string, string[]> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([field, messages]) =>
      Array.isArray(messages)
        ? [[field, messages.filter((message): message is string => typeof message === 'string')]]
        : [],
    ),
  );
}

function parseArea(value: unknown): OnboardingArea {
  if (!isRecord(value)) throw new Error('El servidor devolvió un área inválida.');
  return {
    id: readString(value.id, 'el id del área'),
    nombre: readString(value.nombre, 'el nombre del área'),
    descripcion:
      value.descripcion === null || value.descripcion === undefined
        ? null
        : readString(value.descripcion, 'la descripción del área'),
  };
}

function parseSchedule(value: unknown): OnboardingSchedule {
  if (!isRecord(value) || typeof value.weekday !== 'number') {
    throw new Error('El servidor devolvió un horario inválido.');
  }
  return {
    weekday: value.weekday,
    start: readString(value.start, 'la hora de inicio'),
    end: readString(value.end, 'la hora de fin'),
  };
}

function parseState(value: unknown): MentorOnboardingState {
  if (!isRecord(value) || !isRecord(value.areas) || !isRecord(value.interests) || !isRecord(value.availability)) {
    throw new Error('El servidor devolvió el avance del onboarding con un formato inválido.');
  }
  if (!Array.isArray(value.steps) || !Array.isArray(value.areas.catalog) || !Array.isArray(value.areas.selectedIds)) {
    throw new Error('El servidor devolvió el avance del onboarding con un formato inválido.');
  }
  if (!Array.isArray(value.interests.catalog) || !Array.isArray(value.interests.selectedIds)) {
    throw new Error('El servidor devolvió los intereses del onboarding con un formato inválido.');
  }
  if (!Array.isArray(value.availability.schedules)) {
    throw new Error('El servidor devolvió la disponibilidad con un formato inválido.');
  }

  return {
    isComplete: readBoolean(value.isComplete, 'el estado de finalización'),
    currentStep: readStep(value.currentStep),
    totalSteps: typeof value.totalSteps === 'number' ? value.totalSteps : 3,
    completedSteps: Array.isArray(value.completedSteps)
      ? value.completedSteps.filter((step): step is number => typeof step === 'number')
      : [],
    steps: value.steps.map((step) => {
      if (!isRecord(step)) throw new Error('El servidor devolvió un paso inválido.');
      const key = readString(step.key, 'la clave del paso');
      if (key !== 'areas' && key !== 'interests' && key !== 'availability') {
        throw new Error('El servidor devolvió una clave de paso inválida.');
      }
      return {
        step: readStep(step.step),
        key,
        label: readString(step.label, 'la etiqueta del paso'),
        completed: readBoolean(step.completed, 'el estado del paso'),
      };
    }),
    areas: {
      catalog: value.areas.catalog.map(parseArea),
      selectedIds: value.areas.selectedIds.filter((id): id is string => typeof id === 'string'),
      intereses: Array.isArray(value.areas.intereses)
        ? value.areas.intereses.flatMap((item) =>
            isRecord(item) && typeof item.id_area === 'string' && typeof item.nombre === 'string'
              ? [{ id_area: item.id_area, nombre: item.nombre }]
              : [],
          )
        : [],
    },
    interests: {
      selectedIds: value.interests.selectedIds.filter((id): id is string => typeof id === 'string'),
      catalog: value.interests.catalog.map((group) => {
        if (!isRecord(group) || !isRecord(group.area) || !Array.isArray(group.intereses)) {
          throw new Error('El servidor devolvió un grupo de intereses inválido.');
        }
        const area = {
          id: readString(group.area.id, 'el id del área'),
          nombre: readString(group.area.nombre, 'el nombre del área'),
        };
        return {
          area,
          intereses: group.intereses.map((interest) => {
            if (!isRecord(interest) || !isRecord(interest.area)) {
              throw new Error('El servidor devolvió un interés inválido.');
            }
            return {
              id: readString(interest.id, 'el id del interés'),
              nombre: readString(interest.nombre, 'el nombre del interés'),
              area: {
                id: readString(interest.area.id, 'el área del interés'),
                nombre: readString(interest.area.nombre, 'el nombre del área del interés'),
              },
              seleccionado: interest.seleccionado === true,
            };
          }),
        };
      }),
    },
    availability: {
      availabilityStatus: readStatus(value.availability.availabilityStatus),
      schedules: value.availability.schedules.map(parseSchedule),
    },
  };
}

function fallbackMessage(status: number, code: string): string {
  if (code === 'MENTOR_NO_HABILITADO') {
    return 'Activa tu participación como mentor para configurar tu perfil.';
  }
  if (code === 'PASO_PREVIO_INCOMPLETO') {
    return 'Completa el paso anterior antes de continuar.';
  }
  const messages: Record<number, string> = {
    401: 'Inicia sesión para configurar tu perfil de mentor.',
    403: 'No tienes permiso o no tienes una participación activa como mentor.',
    409: 'Debes completar el paso anterior antes de guardar este paso.',
    422: 'Revisa los datos obligatorios del paso.',
  };
  return messages[status] ?? 'No se pudo guardar. Intenta nuevamente';
}

async function request(path: string, options: RequestInit): Promise<unknown> {
  const token = getAccessToken() ?? (await ensureAccessToken());
  if (!token) {
    throw new MentorOnboardingError('Inicia sesión para configurar tu perfil de mentor.', 401);
  }
  let response: Response;
  try {
    response = await authenticatedFetch(path, {
      ...options,
      credentials: 'omit',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new MentorOnboardingError('No se pudo guardar. Intenta nuevamente', 0);
  }

  if (!response.ok) {
    if (response.status === 401 && getAccessToken() === token) clearAccessToken();
    const body: unknown = await response.json().catch(() => null);
    const detail = isRecord(body) && isRecord(body.error) ? body.error : null;
    const code = detail && typeof detail.code === 'string' ? detail.code : '';
    const fields = detail ? readFields(detail.fields) : {};
    const message =
      detail && typeof detail.message === 'string'
        ? detail.message
        : fallbackMessage(response.status, code);
    throw new MentorOnboardingError(message, response.status, code, fields);
  }

  return (await response.json()).data;
}

export async function getMentorOnboarding(signal?: AbortSignal): Promise<MentorOnboardingState> {
  return parseState(await request(BASE, { method: 'GET', signal }));
}

export async function saveMentorOnboardingAreas(areaIds: string[]): Promise<MentorOnboardingState> {
  return parseState(
    await request(`${BASE}/areas`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ areaIds: Array.from(new Set(areaIds)) }),
    }),
  );
}

export async function saveMentorOnboardingInterests(
  interestIds: string[],
): Promise<MentorOnboardingState> {
  return parseState(
    await request(`${BASE}/interests`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interestIds: Array.from(new Set(interestIds)) }),
    }),
  );
}

export async function saveMentorOnboardingAvailability(
  availabilityStatus: OnboardingAvailabilityStatus,
  schedules: OnboardingSchedule[],
): Promise<MentorOnboardingState> {
  return parseState(
    await request(`${BASE}/availability`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ availabilityStatus, schedules }),
    }),
  );
}
