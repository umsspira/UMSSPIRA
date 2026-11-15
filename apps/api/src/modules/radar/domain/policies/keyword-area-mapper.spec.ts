import { RADAR_AREA_IDS } from '../entities/radar-area';
import { mapKeywordsToRadarAreas } from './keyword-area-mapper';

describe('mapKeywordsToRadarAreas', () => {
  it('asigna una keyword a todas sus áreas con el peso configurado', () => {
    const result = mapKeywordsToRadarAreas([{ term: 'javascript', count: 2 }], {
      [RADAR_AREA_IDS['data-ai']]: [{ term: 'javascript', peso: 2 }],
      [RADAR_AREA_IDS['software-development']]: [{ term: 'javascript', peso: 4 }],
    });

    expect(result).toEqual([
      {
        term: 'javascript',
        area: 'software-development',
        areaId: RADAR_AREA_IDS['software-development'],
        peso: 4,
      },
      {
        term: 'javascript',
        area: 'data-ai',
        areaId: RADAR_AREA_IDS['data-ai'],
        peso: 2,
      },
    ]);
  });

  it('normaliza términos, ignora keywords sin asociación y no duplica entradas', () => {
    expect(
      mapKeywordsToRadarAreas(
        [
          { term: ' JAVASCRIPT ', count: 1 },
          { term: 'javascript', count: 2 },
          { term: 'no reconocida', count: 1 },
        ],
        {
          [RADAR_AREA_IDS['software-development']]: [
            { term: 'JavaScript', peso: 5 },
            { term: 'typescript', peso: 4 },
          ],
        },
      ),
    ).toEqual([
      {
        term: 'javascript',
        area: 'software-development',
        areaId: RADAR_AREA_IDS['software-development'],
        peso: 5,
      },
    ]);
  });

  it('rechaza un UUID de área desconocido para una keyword reconocida', () => {
    expect(() =>
      mapKeywordsToRadarAreas([{ term: 'javascript', count: 1 }], {
        'unknown-area': [{ term: 'javascript', peso: 5 }],
      }),
    ).toThrow('UUID de área no reconocido: unknown-area');
  });

  it('acepta un catálogo vacío', () => {
    expect(mapKeywordsToRadarAreas([{ term: 'javascript', count: 1 }], {})).toEqual([]);
  });
});
