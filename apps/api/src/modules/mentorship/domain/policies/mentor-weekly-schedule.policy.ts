import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import type { MentorSchedule } from '../entities/mentor';
import { SESSION_MINUTES } from './mentor-schedule.policy';

/** Las horas se eligen en pasos de 30 minutos (HU 6.18). */
export const SCHEDULE_STEP_MINUTES = 30;
export const MAX_SLOTS_PER_DAY = 6;

const DAY_NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const minutes = (time: string) => {
  const [hours, mins] = time.split(':').map(Number);
  return hours * 60 + mins;
};

const range = (slot: MentorSchedule) => `${slot.start}–${slot.end}`;

function invalid(code: string, message: string): never {
  throw new BusinessRuleError('invalid', code, message);
}

/**
 * Valida el horario semanal completo del mentor (CA-F 03, CA-NF 03): formato HH:MM en pasos
 * de 30 minutos, inicio anterior al fin, franjas de al menos una sesión, sin solapes en el
 * mismo día y un máximo de franjas por día. Devuelve las franjas ordenadas por día y hora.
 */
export function validateWeeklySchedule(schedule: readonly MentorSchedule[]): MentorSchedule[] {
  for (const slot of schedule) {
    const day = DAY_NAMES[slot.weekday - 1];
    if (!Number.isInteger(slot.weekday) || !day) {
      invalid('HORARIO_FORMATO_INVALIDO', 'El día de la semana debe estar entre lunes y domingo');
    }
    if (!TIME_PATTERN.test(slot.start) || !TIME_PATTERN.test(slot.end)) {
      invalid('HORARIO_FORMATO_INVALIDO', `Las horas del ${day} deben tener el formato HH:MM`);
    }
    if (minutes(slot.start) % SCHEDULE_STEP_MINUTES || minutes(slot.end) % SCHEDULE_STEP_MINUTES) {
      invalid(
        'HORARIO_FORMATO_INVALIDO',
        `Las horas del ${day} deben ir en pasos de ${SCHEDULE_STEP_MINUTES} minutos`,
      );
    }
    if (minutes(slot.end) <= minutes(slot.start)) {
      invalid(
        'HORARIO_FIN_ANTES_DE_INICIO',
        `En el ${day}, la hora de fin debe ser posterior a la de inicio (${range(slot)})`,
      );
    }
    if (minutes(slot.end) - minutes(slot.start) < SESSION_MINUTES) {
      invalid(
        'HORARIO_DURACION_MINIMA',
        `La franja ${range(slot)} del ${day} debe durar al menos ${SESSION_MINUTES} minutos`,
      );
    }
  }

  const sorted = [...schedule].sort(
    (a, b) => a.weekday - b.weekday || minutes(a.start) - minutes(b.start),
  );
  for (let index = 0; index < sorted.length; index += 1) {
    const slot = sorted[index];
    const day = DAY_NAMES[slot.weekday - 1];
    const sameDay = sorted.filter((other) => other.weekday === slot.weekday);
    if (sameDay.length > MAX_SLOTS_PER_DAY) {
      invalid(
        'HORARIO_LIMITE_FRANJAS',
        `El ${day} admite como máximo ${MAX_SLOTS_PER_DAY} franjas`,
      );
    }
    const next = sorted[index + 1];
    // Las franjas contiguas (10:00–12:00 y 12:00–14:00) se permiten; las que se cruzan, no.
    if (next && next.weekday === slot.weekday && minutes(next.start) < minutes(slot.end)) {
      invalid(
        'HORARIO_SOLAPADO',
        `El ${day} tiene franjas que se solapan (${range(slot)} y ${range(next)})`,
      );
    }
  }
  return sorted.map(({ weekday, start, end }) => ({ weekday, start, end }));
}
