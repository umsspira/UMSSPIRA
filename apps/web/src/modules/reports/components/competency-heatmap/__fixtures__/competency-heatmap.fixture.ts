/** SOLO PARA PRUEBAS Y PREVISUALIZACIÓN LOCAL. NUNCA IMPORTAR EN LA VISTA DE PRODUCCIÓN. */
import type { AffinityArea } from '@umsspira/shared-types';
import type { HeatmapCell, HeatmapData } from '../heatmap.types';

const AREA_ORDER = [
  'software-development',
  'cloud-devops',
  'data-ai',
  'quality-assurance',
  'cybersecurity-networks',
  'it-management',
] as const satisfies readonly AffinityArea[];

function row(year: number, values: readonly (number | 'none' | 'insufficient')[]): HeatmapData['cohorts'][number] {
  const areas = {} as Record<AffinityArea, HeatmapCell>;
  AREA_ORDER.forEach((area, index) => {
    const value = values[index];
    areas[area] = value === 'none' ? { status: 'no-data' } :
      value === 'insufficient' ? { status: 'insufficient' } :
      { status: 'calculated', percentage: value, graduateCount: area === 'data-ai' && year === 2021 ? 9 : area === 'software-development' && year === 2021 ? 10 : 8 };
  });
  return { year, areas };
}

export function heatmapMockupFixture(): HeatmapData {
  return {
    updatedAt: '2026-11-09T18:40:00-04:00',
    cohorts: [
      row(2019, [72, 45, 38, 61, 'none', 52]),
      row(2020, [81, 58, 47, 66, 33, 55]),
      row(2021, [76, 63, 64, 70, 41, 49]),
      row(2022, [68, 71, 55, 59, 18, 'none']),
      row(2023, ['insufficient', 'insufficient', 'insufficient', 'insufficient', 'insufficient', 'insufficient']),
    ],
  };
}
