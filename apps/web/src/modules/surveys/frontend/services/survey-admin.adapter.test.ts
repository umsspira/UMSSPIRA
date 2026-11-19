import {
  formatDate,
  mapSurveyList,
  toInputDate,
} from './survey-admin.adapter';

describe('survey-admin.adapter', () => {
  it('mapea la lista y tolera campos null', () => {
    const list = mapSurveyList({
      data: [
        {
          id: 'a1',
          title: 'Encuesta 2026',
          startDate: '2026-01-15T00:00:00.000Z',
          endDate: '2026-12-31T00:00:00.000Z',
          status: 'PUBLICADA',
        },
        { id: 'a2', title: null, startDate: null, endDate: null, status: null },
      ],
    });
    expect(list).toHaveLength(2);
    expect(list[0].status).toBe('PUBLICADA');
    expect(list[1].title).toBeNull();
  });

  it('devuelve lista vacía si la respuesta no tiene data', () => {
    expect(mapSurveyList({})).toEqual([]);
  });

  it('formatea fechas como dd/mm/aaaa sin cambiar el día', () => {
    expect(formatDate('2026-01-15T00:00:00.000Z')).toBe('15/01/2026');
    expect(formatDate(null)).toBe('—');
  });

  it('convierte la fecha al formato del campo date', () => {
    expect(toInputDate('2026-12-31T00:00:00.000Z')).toBe('2026-12-31');
    expect(toInputDate(null)).toBe('');
  });
});