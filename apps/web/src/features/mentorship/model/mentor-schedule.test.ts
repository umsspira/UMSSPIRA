import {
  addSlot,
  dayOptionLabel,
  isScheduleDirty,
  removeSlot,
  summarizeSchedule,
  validateNewSlot,
  type ScheduleSlot,
} from './mentor-schedule';

const monday: ScheduleSlot = { weekday: 1, start: '09:00', end: '10:00' };

describe('validateNewSlot', () => {
  it('acepta una franja válida y una contigua en el mismo día', () => {
    expect(validateNewSlot([], monday)).toBeNull();
    expect(validateNewSlot([monday], { weekday: 1, start: '10:00', end: '11:30' })).toBeNull();
  });

  it('rechaza horas fuera de los pasos de 30 minutos', () => {
    expect(validateNewSlot([], { weekday: 1, start: '09:15', end: '10:30' })).toMatchObject({ field: 'start' });
  });

  it('exige que el fin sea posterior al inicio y que la franja dure al menos 1 hora', () => {
    expect(validateNewSlot([], { weekday: 1, start: '10:00', end: '09:00' })).toEqual({
      field: 'end', message: 'La hora de fin debe ser posterior a la de inicio.',
    });
    expect(validateNewSlot([], { weekday: 1, start: '09:00', end: '09:30' })).toEqual({
      field: 'end', message: 'La franja debe durar al menos 1 hora.',
    });
  });

  it('detecta solapes solo en el mismo día', () => {
    expect(validateNewSlot([monday], { weekday: 1, start: '09:30', end: '11:00' })).toEqual({
      field: 'start', message: 'Se solapa con 09:00–10:00.',
    });
    expect(validateNewSlot([monday], { weekday: 2, start: '09:30', end: '11:00' })).toBeNull();
  });

  it('limita a seis franjas por día', () => {
    const full = Array.from({ length: 6 }, (_, index) => ({
      weekday: 3, start: `${String(8 + index * 2).padStart(2, '0')}:00`, end: `${String(9 + index * 2).padStart(2, '0')}:00`,
    }));
    expect(validateNewSlot(full, { weekday: 3, start: '21:00', end: '22:00' })?.message).toBe('Puedes agregar hasta 6 horarios por día.');
  });
});

describe('resumen y cambios', () => {
  it('resume los días configurados y cuenta las franjas por día', () => {
    expect(summarizeSchedule([])).toBe('Aún no configuraste días ni horas para tus mentorías.');
    const schedule = addSlot([monday], { weekday: 4, start: '15:00', end: '17:00' });
    expect(summarizeSchedule([monday])).toBe('1 día con horarios: Lun');
    expect(summarizeSchedule(schedule)).toBe('2 días con horarios: Lun, Jue');
    expect(dayOptionLabel(schedule, 1)).toBe('Lunes (1)');
    expect(dayOptionLabel(schedule, 2)).toBe('Martes');
  });

  it('detecta cambios sin importar el orden y vuelve a limpio al quitar lo agregado', () => {
    const tuesday = { weekday: 2, start: '18:00', end: '20:00' };
    expect(isScheduleDirty([monday, tuesday], [tuesday, monday])).toBe(false);
    const draft = addSlot([monday], tuesday);
    expect(isScheduleDirty([monday], draft)).toBe(true);
    expect(isScheduleDirty([monday], removeSlot(draft, tuesday))).toBe(false);
  });
});
