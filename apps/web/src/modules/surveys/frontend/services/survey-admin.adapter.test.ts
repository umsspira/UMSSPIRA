import {
  displayCareerName,
  formatDate,
  joinCareerNames,
  mapSurveyList,
  toCreateBody,
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
          careerId: 'c1',
        },
        { id: 'a2', title: null, startDate: null, endDate: null, status: null },
      ],
    });
    expect(list).toHaveLength(2);
    expect(list[0].status).toBe('PUBLICADA');
    expect(list[0].careerId).toBe('c1');
    expect(list[1].careerId).toBeNull();
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

  it('quita «Lic. en» del nombre de la carrera (bug 1 del QA de la HU-005)', () => {
    expect(displayCareerName('Lic. en Ingeniería de Sistemas')).toBe('Ingeniería de Sistemas');
    expect(displayCareerName('Ingeniería Informática')).toBe('Ingeniería Informática');
  });

  it('une los nombres de las carreras con «y» o «e»', () => {
    expect(joinCareerNames(['Ingeniería de Sistemas'])).toBe('Ingeniería de Sistemas');
    expect(joinCareerNames(['Ingeniería de Sistemas', 'Ingeniería en Informática'])).toBe(
      'Ingeniería de Sistemas e Ingeniería en Informática',
    );
    expect(joinCareerNames(['Ingeniería Civil', 'Biología', 'Matemáticas'])).toBe(
      'Ingeniería Civil, Biología y Matemáticas',
    );
  });

  it('envía la carrera al crear solo si se eligió', () => {
    const values = { title: ' Encuesta ', startDate: '2027-01-15', endDate: '2027-12-31' };
    expect(JSON.parse(toCreateBody(values))).toEqual({
      title: 'Encuesta',
      startDate: '2027-01-15',
      endDate: '2027-12-31',
    });
    expect(JSON.parse(toCreateBody({ ...values, careerId: 'c2' })).careerId).toBe('c2');
  });
});