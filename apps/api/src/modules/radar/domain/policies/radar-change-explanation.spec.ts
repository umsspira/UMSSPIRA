import { explainRadarChanges } from './radar-change-explanation';
import { calculateInputHash } from './input-hash';
import { ALGORITHM_VERSION, DICTIONARY_VERSION } from './affinity-config';

describe('radar-change-explanation (HU-13 / T13.2 & T13.3)', () => {
  const CLOUD_AREA_ID = '22222222-2222-2222-2222-222222222222';

  it('reproduce el ejemplo 10.3 (CA-01, CA-02): Cloud/DevOps de 0% a 35% con AWS +25 y Solutions Architect +10', () => {
    const previous = {
      versionAlgoritmo: ALGORITHM_VERSION,
      versionDiccionario: DICTIONARY_VERSION,
      afinidad: [
        {
          areaId: CLOUD_AREA_ID,
          area: 'cloud-devops',
          porcentaje: 0,
          contribucionesKeyword: [],
        },
      ],
    };

    const current = {
      versionAlgoritmo: ALGORITHM_VERSION,
      versionDiccionario: DICTIONARY_VERSION,
      afinidad: [
        {
          areaId: CLOUD_AREA_ID,
          area: 'cloud-devops',
          porcentaje: 35,
          contribucionesKeyword: [
            { keyword: 'aws', weight: 5, frequency: 2, points: 10, percentage: 25 },
            {
              keyword: 'solutions architect',
              weight: 4,
              frequency: 1,
              points: 4,
              percentage: 10,
            },
          ],
        },
      ],
    };

    const [explanation] = explainRadarChanges(current, previous);

    expect(explanation).toEqual({
      areaId: CLOUD_AREA_ID,
      area: 'cloud-devops',
      previousAffinity: 0,
      affinity: 35,
      deltaAffinity: 35,
      cause: 'profile',
      variation: 'increase',
      isFirstCalculation: false,
      changes: [
        {
          keyword: 'aws',
          previousPoints: 0,
          currentPoints: 10,
          deltaPoints: 10,
          deltaPercentagePoints: 25,
        },
        {
          keyword: 'solutions architect',
          previousPoints: 0,
          currentPoints: 4,
          deltaPoints: 4,
          deltaPercentagePoints: 10,
        },
      ],
    });
  });

  it('clasifica aumento, disminucion y sin variacion visible (CA-03)', () => {
    const previous = {
      versionAlgoritmo: ALGORITHM_VERSION,
      versionDiccionario: DICTIONARY_VERSION,
      afinidad: [
        { areaId: 'a1', porcentaje: 20, contribucionesKeyword: [] },
        { areaId: 'a2', porcentaje: 50, contribucionesKeyword: [] },
        { areaId: 'a3', porcentaje: 30.1, contribucionesKeyword: [] },
      ],
    };

    const current = {
      versionAlgoritmo: ALGORITHM_VERSION,
      versionDiccionario: DICTIONARY_VERSION,
      afinidad: [
        { areaId: 'a1', porcentaje: 35, contribucionesKeyword: [] },
        { areaId: 'a2', porcentaje: 25, contribucionesKeyword: [] },
        { areaId: 'a3', porcentaje: 30.4, contribucionesKeyword: [] },
      ],
    };

    const result = explainRadarChanges(current, previous);
    expect(result.map((item) => item.variation)).toEqual(['increase', 'decrease', 'unchanged']);
  });

  it('identifica cuando el cambio proviene de algoritmo o diccionario (CA-04)', () => {
    const baseArea = [{ areaId: CLOUD_AREA_ID, porcentaje: 25, contribucionesKeyword: [] }];

    const byDictionary = explainRadarChanges(
      {
        versionAlgoritmo: ALGORITHM_VERSION,
        versionDiccionario: '2026-11-15.1',
        afinidad: baseArea,
      },
      {
        versionAlgoritmo: ALGORITHM_VERSION,
        versionDiccionario: DICTIONARY_VERSION,
        afinidad: baseArea,
      },
    );
    expect(byDictionary[0]?.cause).toBe('dictionary');

    const byAlgorithm = explainRadarChanges(
      {
        versionAlgoritmo: '2.0.0/2026-11-15.1',
        versionDiccionario: DICTIONARY_VERSION,
        afinidad: baseArea,
      },
      {
        versionAlgoritmo: ALGORITHM_VERSION,
        versionDiccionario: DICTIONARY_VERSION,
        afinidad: baseArea,
      },
    );
    expect(byAlgorithm[0]?.cause).toBe('algorithm');
  });

  it('en el primer calculo expone aportes actuales sin comparacion previa (CA-05)', () => {
    const current = {
      versionAlgoritmo: ALGORITHM_VERSION,
      versionDiccionario: DICTIONARY_VERSION,
      afinidad: [
        {
          areaId: CLOUD_AREA_ID,
          porcentaje: 25,
          contribucionesKeyword: [
            { keyword: 'docker', weight: 5, frequency: 2, points: 10, percentage: 25 },
          ],
        },
      ],
    };

    const [explanation] = explainRadarChanges(current, null);
    expect(explanation?.isFirstCalculation).toBe(true);
    expect(explanation?.previousAffinity).toBeNull();
    expect(explanation?.variation).toBe('initial');
    expect(explanation?.cause).toBe('initial');
    expect(explanation?.changes).toEqual([
      {
        keyword: 'docker',
        previousPoints: 0,
        currentPoints: 10,
        deltaPoints: 10,
        deltaPercentagePoints: 25,
      },
    ]);
  });

  it('usa todas las contribuciones persistidas cuando hay mas de 5 keywords (CA-08)', () => {
    const sixKeywords = [
      { keyword: 'k1', weight: 5, frequency: 1, points: 5, percentage: 12.5 },
      { keyword: 'k2', weight: 5, frequency: 1, points: 5, percentage: 12.5 },
      { keyword: 'k3', weight: 4, frequency: 1, points: 4, percentage: 10 },
      { keyword: 'k4', weight: 4, frequency: 1, points: 4, percentage: 10 },
      { keyword: 'k5', weight: 3, frequency: 1, points: 3, percentage: 7.5 },
      { keyword: 'k6', weight: 2, frequency: 1, points: 2, percentage: 5 },
    ];

    const [explanation] = explainRadarChanges(
      {
        versionAlgoritmo: ALGORITHM_VERSION,
        versionDiccionario: DICTIONARY_VERSION,
        afinidad: [
          {
            areaId: CLOUD_AREA_ID,
            porcentaje: 57.5,
            palabrasClaveTop: sixKeywords.slice(0, 5),
            contribucionesKeyword: sixKeywords,
          },
        ],
      },
      {
        versionAlgoritmo: ALGORITHM_VERSION,
        versionDiccionario: DICTIONARY_VERSION,
        afinidad: [{ areaId: CLOUD_AREA_ID, porcentaje: 0, contribucionesKeyword: [] }],
      },
    );

    expect(explanation?.changes).toHaveLength(6);
    expect(explanation?.changes.some((item) => item.keyword === 'k6')).toBe(true);
  });

  it('invalida el hash cuando se publica una nueva version de diccionario (T13.3)', () => {
    const texts = ['AWS Certified Solutions Architect'];
    const currentHash = calculateInputHash(texts, DICTIONARY_VERSION);
    const updatedDictionaryHash = calculateInputHash(texts, '2026-11-15.1');

    expect(updatedDictionaryHash).not.toBe(currentHash);
  });
});