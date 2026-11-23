import { createEventSchema, reminderSettingsSchema } from './events.schemas';

const eventInput = {
  title: 'Encuentro cultural',
  startDate: '2027-01-01T10:00:00.000Z',
  endDate: '2027-01-01T12:00:00.000Z',
  maxCapacity: 30,
};

describe('configuración global de recordatorios', () => {
  it('no acepta una anticipación específica al crear eventos', () => {
    expect(createEventSchema.safeParse({
      ...eventInput,
      reminderAdvanceHours: 6,
    }).success).toBe(false);
  });

  it.each([1, 24, 720])('acepta una configuración global de %s horas', (hours) => {
    expect(reminderSettingsSchema.parse({ anticipationHours: hours })).toEqual({
      anticipationHours: hours,
    });
  });

  it.each([0, 721, 1.5])('rechaza una configuración inválida de %s horas', (hours) => {
    expect(reminderSettingsSchema.safeParse({ anticipationHours: hours }).success).toBe(false);
  });
});
