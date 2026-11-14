import {
  HEATMAP_AREAS,
  HEATMAP_AREA_LABELS,
  HEATMAP_PALETTE,
  formatHeatmapUpdatedAt,
  orderedCohorts,
  percentageBand,
  percentageColor,
  safeCell,
} from './heatmap.utils';
import { heatmapMockupFixture } from './__fixtures__/competency-heatmap.fixture';

describe('HU-EP09-06 T2.2: catálogo, 5 tramos y orden', () => {
  it('utiliza exactamente las 6 áreas oficiales del radar, en su orden', () => {
    expect(HEATMAP_AREAS).toEqual([
      'software-development', 'cloud-devops', 'data-ai',
      'quality-assurance', 'cybersecurity-networks', 'it-management',
    ]);
    expect(HEATMAP_AREA_LABELS['quality-assurance']).toBe('Aseguramiento de Calidad (QA)');
  });

  it.each([
    [0, 0], [19.999, 0], [20, 1], [39.999, 1], [40, 2],
    [59.999, 2], [60, 3], [79.999, 3], [80, 4], [100, 4],
  ])('asigna %s %% al tramo %s', (percentage, expected) => {
    expect(percentageBand(percentage)).toBe(expected);
    expect(percentageColor(percentage)).toBe(HEATMAP_PALETTE[expected]);
  });

  it.each([-1, 100.01, Number.NaN, Infinity])('rechaza porcentaje inválido: %s', value => {
    expect(() => percentageBand(value)).toThrow();
  });

  it('ordena los años sin alterar el arreglo recibido', () => {
    const fixture = heatmapMockupFixture();
    const unsorted = [...fixture.cohorts].reverse();
    expect(orderedCohorts(unsorted).map(x => x.year)).toEqual([2019, 2020, 2021, 2022, 2023]);
    expect(unsorted[0].year).toBe(2023);
  });
});

describe('HU-EP09-06 T2.3: privacidad y fecha', () => {
  it.each([1, 2, 3, 4])('no revela una muestra de %s titulados', graduateCount => {
    expect(safeCell({ status: 'calculated', percentage: 99, graduateCount })).toEqual({ status: 'insufficient' });
  });
  it('distingue 0 titulados de un porcentaje 0 calculado sobre 5', () => {
    expect(safeCell({ status: 'calculated', percentage: 70, graduateCount: 0 })).toEqual({ status: 'no-data' });
    expect(safeCell({ status: 'calculated', percentage: 0, graduateCount: 5 })).toEqual({ status: 'calculated', percentage: 0, graduateCount: 5 });
  });
  it('formatea la fecha de actualización real en Bolivia', () => {
    expect(formatHeatmapUpdatedAt('2026-11-09T18:40:00-04:00')).toBe('09/11/2026 18:40');
    expect(formatHeatmapUpdatedAt('2026-11-09T22:40:00Z')).toBe('09/11/2026 18:40');
    expect(formatHeatmapUpdatedAt('')).toBe('—');
    expect(formatHeatmapUpdatedAt('2026-11-09T18:40:00')).toBe('—');
  });
});
