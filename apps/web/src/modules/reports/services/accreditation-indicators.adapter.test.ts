import { mapAccreditationResponse } from './accreditation-indicators.adapter';

describe('mapAccreditationResponse', () => {
  it('mapea los campos del endpoint', () => {
    const result = mapAccreditationResponse({
      data: {
        totalResponses: 42,
        employedGraduates: 33,
        employedPercentage: 78.6,
        averageInsertionMonths: 5.4,
        salaryRanges: [{ range: '5.001–8.000', count: 17 }],
      },
    });
    expect(result.totalResponses).toBe(42);
    expect(result.employedGraduates).toBe(33);
    expect(result.employedPercent).toBe(78.6);
    expect(result.averageInsertionMonths).toBe(5.4);
  });

  it('siempre devuelve los cinco rangos en orden, con 0 si faltan', () => {
    const { salaryRanges } = mapAccreditationResponse({
      data: { salaryRanges: [{ range: '5.001–8.000', count: 17 }] },
    });
    expect(salaryRanges.map((item) => item.range)).toEqual([
      '0–2.999', '3.000–5.000', '5.001–8.000', '8.001–12.000', '12.001–21.000',
    ]);
    expect(salaryRanges.map((item) => item.count)).toEqual([0, 0, 17, 0, 0]);
  });

  it('acepta el formato real del backend (objeto con los 5 rangos)', () => {
    const { salaryRanges } = mapAccreditationResponse({
      data: {
        salaryRanges: {
          '0–2.999': 1, '3.000–5.000': 8, '5.001–8.000': 12, '8.001–12.000': 8, '12.001–21.000': 1,
        },
      },
    });
    expect(salaryRanges.map((item) => item.count)).toEqual([1, 8, 12, 8, 1]);
  });

  it('deja el promedio en null si nadie trabaja', () => {
    expect(
      mapAccreditationResponse({ data: { averageInsertionMonths: null } }).averageInsertionMonths,
    ).toBeNull();
  });

  it('no rompe con una respuesta vacía', () => {
    const result = mapAccreditationResponse({});
    expect(result.totalResponses).toBe(0);
    expect(result.salaryRanges).toHaveLength(5);
  });
});