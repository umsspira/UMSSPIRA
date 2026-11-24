import { Logger } from '@nestjs/common';
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

  it('BUG-RADAR-01: ignora y registra en el log un UUID de área ajeno al radar sin lanzar error ni sumar puntos', () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    const result = mapKeywordsToRadarAreas(
      [
        { term: 'postgresql', count: 1 },
        { term: 'gestion de proyectos', count: 1 },
      ],
      {
        '60000000-0000-4000-8000-000000000018': [{ term: 'postgresql', peso: 4 }],
        '60000000-0000-4000-8000-000000000005': [{ term: 'gestion de proyectos', peso: 5 }],
        [RADAR_AREA_IDS['software-development']]: [{ term: 'postgresql', peso: 4 }],
        [RADAR_AREA_IDS['it-management']]: [{ term: 'gestion de proyectos', peso: 5 }],
      },
    );

    expect(result).toEqual([
      {
        term: 'postgresql',
        area: 'software-development',
        areaId: RADAR_AREA_IDS['software-development'],
        peso: 4,
      },
      {
        term: 'gestion de proyectos',
        area: 'it-management',
        areaId: RADAR_AREA_IDS['it-management'],
        peso: 5,
      },
    ]);
    expect(warnSpy).toHaveBeenCalledTimes(2);
    warnSpy.mockRestore();
  });

  it('acepta un catálogo vacío', () => {
    expect(mapKeywordsToRadarAreas([{ term: 'javascript', count: 1 }], {})).toEqual([]);
  });
});