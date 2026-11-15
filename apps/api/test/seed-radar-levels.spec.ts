import { systemsRadarAffinities } from '../scripts/seed/epic-9';
import { qaSecondCareerRadarAffinities } from '../scripts/seed/qa-second-career';

jest.mock('../scripts/seed/informatics-career', () => ({
  seedInformaticsCareer: jest.fn(),
}));

const tiers = (rows: ReadonlyArray<{ porcentaje: unknown }>) =>
  [...new Set(rows.map((row) => Math.min(Math.floor(Number(row.porcentaje) / 20), 4)))].sort();

describe('Radar de QA en los 5 tramos de color del mapa (HU-002 CA-02)', () => {
  it('Ingeniería de Sistemas tiene porcentajes en los 5 tramos', () => {
    expect(tiers(systemsRadarAffinities)).toEqual([0, 1, 2, 3, 4]);
  });

  it('Ingeniería Informática tiene porcentajes en los 5 tramos', () => {
    expect(tiers(qaSecondCareerRadarAffinities)).toEqual([0, 1, 2, 3, 4]);
  });
});
