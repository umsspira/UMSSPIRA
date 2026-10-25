import { CalculateRadarUseCase } from './calculate-radar.use-case';
import type { AffinityCalculation } from '../../domain/entities/affinity-calculation';
import type { RadarRepositoryPort } from '../ports/radar-repository.port';

describe('CalculateRadarUseCase', () => {
  it('calcula los ejes, persiste el resultado y devuelve el cálculo guardado', async () => {
    const save = jest.fn<Promise<void>, [AffinityCalculation]>().mockResolvedValue();
    const repository: RadarRepositoryPort = { save };
    const useCase = new CalculateRadarUseCase(repository);
    const calculatedAt = new Date('2026-10-22T12:00:00.000Z');

    const result = await useCase.execute({
      graduateId: 'graduate-id',
      inputHash: 'input-hash',
      keywords: [{ term: 'typescript', count: 2 }],
      areaWeights: [{ term: 'typescript', area: 'software-development', weight: 5 }],
      unmapped: [{ term: 'desconocido', count: 1 }],
      calculatedAt,
    });

    expect(result.areas.find(({ area }) => area === 'software-development')).toMatchObject({
      score: 10,
      percentage: 66.67,
      weighting: 5,
    });
    expect(result.unmapped).toEqual([{ term: 'desconocido', count: 1 }]);
    expect(save).toHaveBeenCalledWith(result);
  });
});
