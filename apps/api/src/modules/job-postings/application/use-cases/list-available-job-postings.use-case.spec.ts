import type { JobPostingListCandidate } from '../contracts/available-job-posting';
import type { JobPostingRepository } from '../ports/job-posting-repository.port';
import { ListAvailableJobPostingsUseCase } from './list-available-job-postings.use-case';

describe('ListAvailableJobPostingsUseCase', () => {
  const now = new Date('2026-11-16T12:00:00.000Z');

  function candidate(
    id: string,
    overrides: Partial<JobPostingListCandidate> = {},
  ): JobPostingListCandidate {
    return {
      id,
      title: `Puesto ${id}`,
      companyName: 'Empresa',
      publicationDate: new Date('2026-11-16T10:00:00.000Z'),
      status: 'PUBLICADO',
      closingDate: null,
      ...overrides,
    };
  }

  it('solo devuelve registros publicados cuyo cierre sea nulo o futuro', async () => {
    const candidates = [
      candidate('open'),
      candidate('future-close', {
        status: 'PUBLICADA',
        closingDate: new Date('2026-11-17T00:00:00.000Z'),
      }),
      candidate('closed', { status: 'CERRADA' }),
      candidate('expired', { closingDate: new Date('2026-11-16T11:00:00.000Z') }),
      candidate('unknown', { status: 'DISPONIBLE' }),
    ];
    const repository: JobPostingRepository = {
      create: async () => null,
      listPublished: async () => candidates,
      findById: async () => null,
    };
    const useCase = new ListAvailableJobPostingsUseCase(repository, () => now);

    await expect(useCase.execute()).resolves.toEqual([
      candidates[0],
      candidates[1],
    ]);
  });
});
