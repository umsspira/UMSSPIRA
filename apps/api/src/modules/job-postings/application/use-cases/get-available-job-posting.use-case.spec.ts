import type { JobPostingDetailCandidate } from '../contracts/available-job-posting';
import type { JobPostingRepository } from '../ports/job-posting-repository.port';
import { JobPostingNotFoundError } from '../../domain/errors/job-posting-not-found.error';
import { GetAvailableJobPostingUseCase } from './get-available-job-posting.use-case';

describe('GetAvailableJobPostingUseCase', () => {
  const now = new Date('2026-11-16T12:00:00.000Z');

  function candidate(
    overrides: Partial<JobPostingDetailCandidate> = {},
  ): JobPostingDetailCandidate {
    return {
      id: 'vacancy-1',
      title: 'Desarrollador',
      companyName: 'Empresa',
      publicationDate: new Date('2026-11-16T10:00:00.000Z'),
      status: 'PUBLICADO',
      closingDate: null,
      technicalDescription: 'Descripción',
      modality: 'REMOTO',
      experienceLevel: 'JUNIOR',
      requirements: [],
      ...overrides,
    };
  }

  function repositoryWith(posting: JobPostingDetailCandidate | null): JobPostingRepository {
    return {
      create: async () => null,
      listPublished: async () => [],
      findById: async () => posting,
    };
  }

  it('devuelve los requisitos asociados al detalle disponible', async () => {
    const posting = candidate({
      requirements: [
        { id: 'requirement-1', name: 'Python', normalizedName: 'python' },
      ],
    });
    const useCase = new GetAvailableJobPostingUseCase(repositoryWith(posting), () => now);

    await expect(useCase.execute(posting.id)).resolves.toBe(posting);
  });

  it.each([
    candidate({ status: 'CERRADO' }),
    candidate({ status: 'CERRADA' }),
    candidate({ status: 'PUBLICADO', closingDate: new Date('2026-11-16T11:00:00.000Z') }),
    candidate({ status: 'DISPONIBLE' }),
  ])('oculta una vacante no disponible con 404', async (posting) => {
    const useCase = new GetAvailableJobPostingUseCase(repositoryWith(posting), () => now);

    await expect(useCase.execute(posting.id)).rejects.toBeInstanceOf(
      JobPostingNotFoundError,
    );
  });

  it('responde 404 cuando el identificador no existe', async () => {
    const useCase = new GetAvailableJobPostingUseCase(repositoryWith(null), () => now);

    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(
      JobPostingNotFoundError,
    );
  });
});
