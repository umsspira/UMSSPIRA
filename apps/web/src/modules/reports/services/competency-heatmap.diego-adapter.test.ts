import { RADAR_AREA_IDS } from '@umsspira/shared-types';
import { adaptDiegoCompetencyHeatmap } from './competency-heatmap.diego-adapter';

const software = RADAR_AREA_IDS['software-development'];
const quality = RADAR_AREA_IDS['quality-assurance'];

function response(cells: unknown[], changes: Record<string, unknown> = {}) {
  return {
    data: {
      updatedAt: '2026-11-09T22:40:00.000Z',
      areas: [
        { id: software, name: 'Desarrollo de Software' },
        { id: quality, name: 'Aseguramiento de Calidad (QA)' },
      ],
      cohorts: ['2023', '2021'],
      cells,
      ...changes,
    },
  };
}

describe('T2.2/T2.3: adaptación del contrato HTTP de Diego', () => {
  it('mapea UUID a las seis áreas oficiales, conserva el 0 % y las cohortes', () => {
    const parsed = adaptDiegoCompetencyHeatmap(response([
      { cohort: '2021', areaId: software, areaName: 'Desarrollo de Software',
        graduateCount: 5, percentage: 0 },
      { cohort: '2023', areaId: quality, areaName: 'Aseguramiento de Calidad (QA)',
        graduateCount: 10, percentage: 80 },
    ]));
    expect(parsed.updatedAt).toBe('2026-11-09T22:40:00.000Z');
    expect(parsed.cohorts).toHaveLength(2);
    expect(Object.keys(parsed.cohorts[0].areas)).toHaveLength(6);
    expect(parsed.cohorts[1].areas['quality-assurance']).toEqual({
      status: 'calculated', percentage: 80, graduateCount: 10,
    });
    expect(parsed.cohorts[0].areas['software-development']).toEqual({
      status: 'calculated', percentage: 0, graduateCount: 5,
    });
    expect(parsed.cohorts[0].areas['cloud-devops']).toEqual({ status: 'no-data' });
  });

  it('distingue ausencia real de datos y muestra insuficiente ya protegida', () => {
    const result = adaptDiegoCompetencyHeatmap(response([
      { cohort: '2021', areaId: software, percentage: null, graduateCount: 0 },
      { cohort: '2021', areaId: quality, status: 'insufficient',
        percentage: null, graduateCount: null },
    ]));
    expect(result.cohorts.map((cohort) => cohort.year)).toEqual([2021, 2023]);
    expect(result.cohorts[0].areas['software-development']).toEqual({ status: 'no-data' });
    expect(result.cohorts[0].areas['quality-assurance']).toEqual({ status: 'insufficient' });
  });

  it.each([1, 2, 3, 4])('rechaza que la API divulgue %s titulados (CA-06)', count => {
    expect(() => adaptDiegoCompetencyHeatmap(response([
      { cohort: '2021', areaId: software, percentage: null, graduateCount: count },
    ]))).toThrow(/CA-06/);
  });

  it('rechaza la ausencia del campo updatedAt (CA-07)', () => {
    expect(() => adaptDiegoCompetencyHeatmap(response([], { updatedAt: undefined })))
      .toThrow(/CA-07/);
  });

  it('acepta los tres estados del contrato real de T2.1: ok, insufficient y no-data', () => {
    const result = adaptDiegoCompetencyHeatmap(response([
      { cohort: '2021', areaId: software, status: 'ok', graduateCount: 5, percentage: 70 },
      { cohort: '2021', areaId: quality, status: 'no-data' },
      { cohort: '2023', areaId: software, status: 'insufficient' },
    ]));
    expect(result.cohorts[0].areas['software-development']).toEqual({
      status: 'calculated', percentage: 70, graduateCount: 5,
    });
    expect(result.cohorts[0].areas['quality-assurance']).toEqual({ status: 'no-data' });
    expect(result.cohorts[1].areas['software-development']).toEqual({ status: 'insufficient' });
  });

  it('admite fecha nula exclusivamente cuando no hay cálculos', () => {
    const empty = adaptDiegoCompetencyHeatmap(response([], { cohorts: [], updatedAt: null }));
    expect(empty).toEqual({ updatedAt: null, cohorts: [] });
    expect(() => adaptDiegoCompetencyHeatmap(response([], { updatedAt: null })))
      .toThrow(/CA-07/);
  });

  it('rechaza cohortes, porcentajes y celdas incoherentes', () => {
    expect(() => adaptDiegoCompetencyHeatmap(response([], { cohorts: ['Sin cohorte'] })))
      .toThrow(/Cohorte inválida/);
    expect(() => adaptDiegoCompetencyHeatmap(response([
      { cohort: '2021', areaId: software, graduateCount: 5, percentage: 102 },
    ]))).toThrow(/Porcentaje inválido/);
    expect(() => adaptDiegoCompetencyHeatmap(response([
      { cohort: '2020', areaId: software, graduateCount: 5, percentage: 72 },
    ]))).toThrow(/no declarada/);
  });
});
