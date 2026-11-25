import type { JobPostingAffinityBatchItem } from '@umsspira/shared-types';
import { apiFetch, ApiError } from './api-client';
import {
  calculateVacancyAffinity,
  getVacanciesAffinityBatch,
  getVacancyAffinity,
} from './job-posting-affinity';

jest.mock('./api-client', () => ({
  apiFetch: jest.fn(),
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string, public code?: string) {
      super(message);
    }
  },
}));

const mockApiFetch = jest.mocked(apiFetch);

describe('job-posting-affinity service client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retorna mapa vacío si la lista de IDs está vacía sin llamar a apiFetch', async () => {
    const result = await getVacanciesAffinityBatch([]);
    expect(result).toEqual({});
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('consulta afinidad en lote para vacantes con mode: vacancies', async () => {
    const mockBatchItems: JobPostingAffinityBatchItem[] = [
      {
        vacancyId: 'vac-1',
        result: {
          status: 'ready',
          percentage: 85,
          calculatedAt: '2026-11-20T12:00:00.000Z',
          comparison: [{ requirement: 'React', matchedSkill: 'React', result: 'exact' }],
        },
        error: null,
      },
      {
        vacancyId: 'vac-2',
        result: {
          status: 'ready',
          percentage: 0,
          calculatedAt: '2026-11-20T12:00:00.000Z',
          comparison: [{ requirement: 'COBOL', matchedSkill: null, result: 'not-found' }],
        },
        error: null,
      },
    ];

    mockApiFetch.mockResolvedValue(mockBatchItems);

    const result = await getVacanciesAffinityBatch(['vac-1', 'vac-2']);

    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/affinity/batch', {
      method: 'POST',
      body: JSON.stringify({ mode: 'vacancies', vacancyIds: ['vac-1', 'vac-2'] }),
    });
    expect(result['vac-1']).toEqual(mockBatchItems[0]);
    expect(result['vac-2']).toEqual(mockBatchItems[1]);
  });

  it('divide en solicitudes de máximo 50 cuando hay más de 50 vacantes', async () => {
    const ids = Array.from({ length: 55 }, (_, i) => `vac-${i + 1}`);

    mockApiFetch.mockImplementation(async (_path, options) => {
      const parsed = JSON.parse(options?.body as string);
      return parsed.vacancyIds.map((id: string) => ({
        vacancyId: id,
        result: {
          status: 'ready',
          percentage: 50,
          calculatedAt: '2026-11-20T12:00:00.000Z',
          comparison: [],
        },
        error: null,
      }));
    });

    const result = await getVacanciesAffinityBatch(ids);

    expect(mockApiFetch).toHaveBeenCalledTimes(2);
    expect(Object.keys(result)).toHaveLength(55);
  });

  it('envía 50 vacantes en una sola solicitud de afinidad', async () => {
    const ids = Array.from({ length: 50 }, (_, index) => `vac-${index}`);
    mockApiFetch.mockResolvedValue([]);

    await getVacanciesAffinityBatch(ids);

    expect(mockApiFetch).toHaveBeenCalledTimes(1);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/affinity/batch', {
      method: 'POST',
      body: JSON.stringify({ mode: 'vacancies', vacancyIds: ids }),
    });
  });

  it('propaga fallo 503 cuando el servicio NLP o diccionario no está disponible', async () => {
    mockApiFetch.mockRejectedValue(
      new ApiError(503, 'Diccionario no disponible', 'NLP_DICTIONARY_UNAVAILABLE'),
    );

    await expect(getVacanciesAffinityBatch(['vac-1'])).rejects.toMatchObject({
      status: 503,
      code: 'NLP_DICTIONARY_UNAVAILABLE',
    });
  });

  it('devuelve item individual mediante getVacancyAffinity', async () => {
    const mockItem: JobPostingAffinityBatchItem = {
      vacancyId: 'vac-1',
      result: {
        status: 'no-requirements',
        percentage: null,
        calculatedAt: null,
        comparison: [],
      },
      error: null,
    };
    mockApiFetch.mockResolvedValue([mockItem]);

    const item = await getVacancyAffinity('vac-1');
    expect(item).toEqual(mockItem);
  });

  it('calculateVacancyAffinity retorna el result si la vacante fue calculada con éxito', async () => {
    const mockItem: JobPostingAffinityBatchItem = {
      vacancyId: 'vac-1',
      result: {
        status: 'profile-incomplete',
        percentage: null,
        calculatedAt: null,
        comparison: [],
      },
      error: null,
    };
    mockApiFetch.mockResolvedValue([mockItem]);

    const result = await calculateVacancyAffinity('vac-1');
    expect(result).toEqual(mockItem.result);
  });

  it('calculateVacancyAffinity lanza error si la vacante tiene error individual', async () => {
    const mockItem: JobPostingAffinityBatchItem = {
      vacancyId: 'vac-1',
      result: null,
      error: {
        code: 'AFFINITY_CALCULATION_FAILED',
        message: 'No se pudo calcular la afinidad',
        retryable: true,
      },
    };
    mockApiFetch.mockResolvedValue([mockItem]);

    await expect(calculateVacancyAffinity('vac-1')).rejects.toMatchObject({
      message: 'No se pudo calcular la afinidad',
      code: 'AFFINITY_CALCULATION_FAILED',
      retryable: true,
    });
  });
});
