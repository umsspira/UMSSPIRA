import { clearAccessToken, getAccessToken } from '@/shared/services/auth-session';
import { authenticatedFetch, ensureAccessToken, SessionError } from '@/shared/services/auth-session';
import type { ScheduleSlot } from '../model/mentor-schedule';

export interface MentorWeeklySchedule {
  schedule: ScheduleSlot[];
  fecha_actualizacion: string | null;
}

const API_URL = '';
const TIME_PATTERN = /^\d{2}:\d{2}$/;

export class MentorScheduleError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'MentorScheduleError';
  }
}

function isSlot(value: unknown): value is ScheduleSlot {
  if (!value || typeof value !== 'object') return false;
  const slot = value as Record<string, unknown>;
  return typeof slot.weekday === 'number' && Number.isInteger(slot.weekday) && slot.weekday >= 1 && slot.weekday <= 7
    && typeof slot.start === 'string' && TIME_PATTERN.test(slot.start)
    && typeof slot.end === 'string' && TIME_PATTERN.test(slot.end);
}

function parseSchedule(value: unknown): MentorWeeklySchedule {
  if (!value || typeof value !== 'object' || !('schedule' in value) || !Array.isArray(value.schedule)
    || !value.schedule.every(isSlot)
    || !('fecha_actualizacion' in value)
    || (value.fecha_actualizacion !== null && typeof value.fecha_actualizacion !== 'string')) {
    throw new Error('El servidor devolvió un horario con formato inválido.');
  }
  return {
    schedule: value.schedule.map(({ weekday, start, end }) => ({ weekday, start, end })),
    fecha_actualizacion: value.fecha_actualizacion,
  };
}

async function requestSchedule(options: RequestInit, action: 'consultar' | 'guardar') {
  const token = getAccessToken() ?? await ensureAccessToken();
  if (!token) {
    throw new MentorScheduleError('Inicia sesión para configurar tus horarios.', 401);
  }

  let response: Response;
  try {
    response = await authenticatedFetch(`${API_URL}/api/v1/mentorship/availability/schedule`, {
      ...options,
      credentials: 'omit',
      cache: 'no-store',
      headers: { Accept: 'application/json', ...options.headers, Authorization: `Bearer ${token}` },
    });
  } catch (error) {
    if (error instanceof SessionError) throw new MentorScheduleError(error.message, error.status);
    throw new MentorScheduleError(
      action === 'guardar'
        ? 'No se pudieron guardar los horarios. Inténtalo de nuevo.'
        : 'No se pudieron cargar los horarios. Revisa tu conexión e inténtalo de nuevo.',
      0,
    );
  }

  if (!response.ok) {
    if (response.status === 401 && getAccessToken() === token) clearAccessToken();
    let backendMessage = '';
    // Un 400 de reglas de horario trae un mensaje claro del backend (solape, duración, etc.).
    if (response.status === 400) {
      try {
        const body = await response.json() as { error?: { message?: unknown } };
        if (typeof body.error?.message === 'string') backendMessage = body.error.message;
      } catch { /* Sin cuerpo legible: se usa el mensaje genérico. */ }
    }
    const messages: Record<number, string> = {
      401: 'Inicia sesión para configurar tus horarios.',
      403: 'Acceso denegado. Se requiere un perfil de mentor activo.',
      404: 'No se encontró el perfil de mentor.',
    };
    throw new MentorScheduleError(
      backendMessage || messages[response.status]
        || (action === 'guardar'
          ? 'No se pudieron guardar los horarios. Inténtalo de nuevo.'
          : 'No se pudieron cargar los horarios. Inténtalo de nuevo.'),
      response.status,
    );
  }

  try {
    return parseSchedule((await response.json()).data);
  } catch (error) {
    if (error instanceof MentorScheduleError) throw error;
    throw new Error('El servidor devolvió un horario con formato inválido.');
  }
}

export function getMentorSchedule(signal?: AbortSignal): Promise<MentorWeeklySchedule> {
  return requestSchedule({ method: 'GET', signal }, 'consultar');
}

export function saveMentorSchedule(schedule: ScheduleSlot[], signal?: AbortSignal): Promise<MentorWeeklySchedule> {
  return requestSchedule({
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schedule: schedule.map(({ weekday, start, end }) => ({ weekday, start, end })) }),
    signal,
  }, 'guardar');
}
