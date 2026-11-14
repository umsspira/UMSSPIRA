import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import { validateWeeklySchedule } from './mentor-weekly-schedule.policy';

const errorCode = (run: () => unknown) => {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(BusinessRuleError);
    return (error as BusinessRuleError).code;
  }
  throw new Error('Se esperaba un error de validación');
};

describe('validateWeeklySchedule', () => {
  it('acepta un horario válido y lo devuelve ordenado por día y hora', () => {
    expect(
      validateWeeklySchedule([
        { weekday: 4, start: '15:00', end: '17:00' },
        { weekday: 1, start: '14:00', end: '15:30' },
        { weekday: 1, start: '09:00', end: '11:00' },
      ]),
    ).toEqual([
      { weekday: 1, start: '09:00', end: '11:00' },
      { weekday: 1, start: '14:00', end: '15:30' },
      { weekday: 4, start: '15:00', end: '17:00' },
    ]);
  });

  it('acepta un horario vacío', () => {
    expect(validateWeeklySchedule([])).toEqual([]);
  });

  it('permite franjas contiguas en el mismo día', () => {
    expect(
      validateWeeklySchedule([
        { weekday: 2, start: '10:00', end: '12:00' },
        { weekday: 2, start: '12:00', end: '14:00' },
      ]),
    ).toHaveLength(2);
  });

  it('rechaza horas mal formadas o fuera de los pasos de 30 minutos', () => {
    expect(errorCode(() => validateWeeklySchedule([{ weekday: 1, start: '9:00', end: '11:00' }]))).toBe(
      'HORARIO_FORMATO_INVALIDO',
    );
    expect(errorCode(() => validateWeeklySchedule([{ weekday: 1, start: '09:15', end: '11:00' }]))).toBe(
      'HORARIO_FORMATO_INVALIDO',
    );
    expect(errorCode(() => validateWeeklySchedule([{ weekday: 8, start: '09:00', end: '11:00' }]))).toBe(
      'HORARIO_FORMATO_INVALIDO',
    );
  });

  it('rechaza una franja cuyo fin no es posterior al inicio', () => {
    expect(errorCode(() => validateWeeklySchedule([{ weekday: 3, start: '11:00', end: '11:00' }]))).toBe(
      'HORARIO_FIN_ANTES_DE_INICIO',
    );
    expect(errorCode(() => validateWeeklySchedule([{ weekday: 3, start: '11:00', end: '09:00' }]))).toBe(
      'HORARIO_FIN_ANTES_DE_INICIO',
    );
  });

  it('rechaza franjas de menos de una sesión de 60 minutos', () => {
    expect(errorCode(() => validateWeeklySchedule([{ weekday: 5, start: '09:00', end: '09:30' }]))).toBe(
      'HORARIO_DURACION_MINIMA',
    );
  });

  it('rechaza franjas que se solapan en el mismo día, pero no en días distintos', () => {
    expect(
      errorCode(() =>
        validateWeeklySchedule([
          { weekday: 1, start: '09:00', end: '11:00' },
          { weekday: 1, start: '10:00', end: '12:00' },
        ]),
      ),
    ).toBe('HORARIO_SOLAPADO');
    expect(
      validateWeeklySchedule([
        { weekday: 1, start: '09:00', end: '11:00' },
        { weekday: 2, start: '10:00', end: '12:00' },
      ]),
    ).toHaveLength(2);
  });

  it('explica el solape con las dos franjas', () => {
    expect(() =>
      validateWeeklySchedule([
        { weekday: 7, start: '09:00', end: '11:00' },
        { weekday: 7, start: '10:30', end: '12:00' },
      ]),
    ).toThrow('El domingo tiene franjas que se solapan (09:00–11:00 y 10:30–12:00)');
  });

  it('rechaza más de seis franjas en un día', () => {
    const slots = Array.from({ length: 7 }, (_, index) => ({
      weekday: 6,
      start: `${String(8 + index * 2).padStart(2, '0')}:00`,
      end: `${String(9 + index * 2).padStart(2, '0')}:00`,
    }));
    expect(errorCode(() => validateWeeklySchedule(slots))).toBe('HORARIO_LIMITE_FRANJAS');
  });
});
