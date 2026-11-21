import { DICTIONARY_VERSION } from '../../domain/policies/affinity-config';
import type {
  AggregatedUnmappedKeyword,
  RadarRepositoryPort,
} from '../ports/radar-repository.port';
import { GetUnmappedKeywordsSummaryUseCase } from './get-unmapped-keywords-summary.use-case';

describe('GetUnmappedKeywordsSummaryUseCase (HU-15 / T15.1)', () => {
  function createRepositoryMock(items: AggregatedUnmappedKeyword[]): RadarRepositoryPort {
    return {
      getLatestCalculation: jest.fn(),
      getPreviousCalculation: jest.fn(),
      getUnmappedKeywords: jest.fn(),
      getAggregatedUnmappedKeywords: jest.fn().mockResolvedValue(items),
      executeWithAdvisoryLock: jest.fn(),
      saveCalculation: jest.fn(),
    };
  }

  it('devuelve frecuencia total y cantidad de titulados ordenados sin exponer identidades (CA-HU15-01)', async () => {
    const detectedAt = new Date('2026-11-14T10:00:00.000Z');
    const repository = createRepositoryMock([
      {
        term: 'supabase',
        totalFrequency: 4,
        graduatesCount: 2,
        lastDetectedAt: detectedAt,
      },
      {
        term: 'opentelemetry',
        totalFrequency: 7,
        graduatesCount: 3,
        lastDetectedAt: detectedAt,
      },
      {
        term: 'astro',
        totalFrequency: 4,
        graduatesCount: 3,
        lastDetectedAt: null,
      },
    ]);

    const useCase = new GetUnmappedKeywordsSummaryUseCase(repository);
    const result = await useCase.execute();

    expect(result.dictionaryVersion).toBe(DICTIONARY_VERSION);
    expect(result.totalTerms).toBe(3);
    expect(result.items).toEqual([
      {
        term: 'opentelemetry',
        totalFrequency: 7,
        graduatesCount: 3,
        lastDetectedAt: detectedAt,
      },
      {
        term: 'astro',
        totalFrequency: 4,
        graduatesCount: 3,
        lastDetectedAt: null,
      },
      {
        term: 'supabase',
        totalFrequency: 4,
        graduatesCount: 2,
        lastDetectedAt: detectedAt,
      },
    ]);

    for (const item of result.items) {
      expect(item).not.toHaveProperty('id_titulado');
      expect(item).not.toHaveProperty('tituladoId');
      expect(item).not.toHaveProperty('graduateId');
    }
  });

  it('descarta entradas vacias o con conteos no positivos', async () => {
    const repository = createRepositoryMock([
      { term: '   ', totalFrequency: 3, graduatesCount: 1, lastDetectedAt: null },
      { term: ' Deno ', totalFrequency: 2, graduatesCount: 1, lastDetectedAt: null },
      { term: 'invalido', totalFrequency: 0, graduatesCount: 1, lastDetectedAt: null },
    ]);

    const useCase = new GetUnmappedKeywordsSummaryUseCase(repository);
    const result = await useCase.execute();

    expect(result.totalTerms).toBe(1);
    expect(result.items).toEqual([
      {
        term: 'deno',
        totalFrequency: 2,
        graduatesCount: 1,
        lastDetectedAt: null,
      },
    ]);
  });
});