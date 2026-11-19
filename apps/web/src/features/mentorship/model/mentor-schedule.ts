/** Franja semanal del mentor: weekday 1 = lunes … 7 = domingo, horas HH:MM de Bolivia (HU 6.18). */
export interface ScheduleSlot {
  weekday: number;
  start: string;
  end: string;
}

export const WEEKDAYS = [
  { weekday: 1, name: 'Lunes', short: 'Lun' },
  { weekday: 2, name: 'Martes', short: 'Mar' },
  { weekday: 3, name: 'Miércoles', short: 'Mié' },
  { weekday: 4, name: 'Jueves', short: 'Jue' },
  { weekday: 5, name: 'Viernes', short: 'Vie' },
  { weekday: 6, name: 'Sábado', short: 'Sáb' },
  { weekday: 7, name: 'Domingo', short: 'Dom' },
] as const;

/** Mismas reglas que valida el backend. */
export const SCHEDULE_STEP_MINUTES = 30;
export const SESSION_MINUTES = 60;
export const MAX_SLOTS_PER_DAY = 6;

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const minutes = (time: string) => {
  const [hours, mins] = time.split(':').map(Number);
  return hours * 60 + mins;
};

export const slotRange = (slot: Pick<ScheduleSlot, 'start' | 'end'>) => `${slot.start}–${slot.end}`;

export const dayName = (weekday: number) =>
  WEEKDAYS.find(day => day.weekday === weekday)?.name ?? '';

export function sortSchedule(schedule: readonly ScheduleSlot[]): ScheduleSlot[] {
  return [...schedule].sort((a, b) => a.weekday - b.weekday || minutes(a.start) - minutes(b.start));
}

export function slotsOf(schedule: readonly ScheduleSlot[], weekday: number): ScheduleSlot[] {
  return sortSchedule(schedule.filter(slot => slot.weekday === weekday));
}

export type SlotField = 'start' | 'end';

export interface SlotError {
  field: SlotField;
  message: string;
}

/** Valida la franja que se quiere agregar contra las ya cargadas en el mismo día (CA-F 03). */
export function validateNewSlot(schedule: readonly ScheduleSlot[], slot: ScheduleSlot): SlotError | null {
  if (!TIME_PATTERN.test(slot.start)) return { field: 'start', message: 'Ingresa la hora de inicio.' };
  if (!TIME_PATTERN.test(slot.end)) return { field: 'end', message: 'Ingresa la hora de fin.' };
  if (minutes(slot.start) % SCHEDULE_STEP_MINUTES) {
    return { field: 'start', message: 'Usa horas en punto o y media (por ejemplo, 09:00 o 09:30).' };
  }
  if (minutes(slot.end) % SCHEDULE_STEP_MINUTES) {
    return { field: 'end', message: 'Usa horas en punto o y media (por ejemplo, 10:00 o 10:30).' };
  }
  if (minutes(slot.end) <= minutes(slot.start)) {
    return { field: 'end', message: 'La hora de fin debe ser posterior a la de inicio.' };
  }
  if (minutes(slot.end) - minutes(slot.start) < SESSION_MINUTES) {
    return { field: 'end', message: 'La franja debe durar al menos 1 hora.' };
  }
  const sameDay = slotsOf(schedule, slot.weekday);
  if (sameDay.length >= MAX_SLOTS_PER_DAY) {
    return { field: 'start', message: `Puedes agregar hasta ${MAX_SLOTS_PER_DAY} horarios por día.` };
  }
  // Las franjas contiguas (10:00–12:00 y 12:00–14:00) se permiten.
  const overlap = sameDay.find(other => minutes(slot.start) < minutes(other.end) && minutes(other.start) < minutes(slot.end));
  if (overlap) return { field: 'start', message: `Se solapa con ${slotRange(overlap)}.` };
  return null;
}

export function addSlot(schedule: readonly ScheduleSlot[], slot: ScheduleSlot): ScheduleSlot[] {
  return sortSchedule([...schedule, slot]);
}

export function removeSlot(schedule: readonly ScheduleSlot[], slot: ScheduleSlot): ScheduleSlot[] {
  return schedule.filter(item => !(item.weekday === slot.weekday && item.start === slot.start && item.end === slot.end));
}

export function isScheduleDirty(saved: readonly ScheduleSlot[], draft: readonly ScheduleSlot[]): boolean {
  const key = (schedule: readonly ScheduleSlot[]) => sortSchedule(schedule).map(slot => `${slot.weekday}-${slot.start}-${slot.end}`).join('|');
  return key(saved) !== key(draft);
}

export function configuredDays(schedule: readonly ScheduleSlot[]) {
  return WEEKDAYS.filter(day => schedule.some(slot => slot.weekday === day.weekday));
}

export function summarizeSchedule(schedule: readonly ScheduleSlot[]): string {
  const days = configuredDays(schedule);
  if (!days.length) return 'Aún no configuraste días ni horas para tus mentorías.';
  return `${days.length} ${days.length === 1 ? 'día' : 'días'} con horarios: ${days.map(day => day.short).join(', ')}`;
}

export function dayOptionLabel(schedule: readonly ScheduleSlot[], weekday: number): string {
  const count = slotsOf(schedule, weekday).length;
  return count ? `${dayName(weekday)} (${count})` : dayName(weekday);
}
