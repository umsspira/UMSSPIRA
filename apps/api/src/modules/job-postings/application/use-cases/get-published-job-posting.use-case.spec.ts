import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { PublishedJobPosting } from '../../domain/entities/published-job-posting.entity';
import { JobPostingNotFoundError } from '../../domain/errors/job-posting-not-found.error';
import type { JobPostingRepository } from '../ports/job-posting-repository.port';
import type { PublishedTechnicalRequirementsReader } from '../ports/published-technical-requirements-reader.port';
import { GetPublishedJobPostingUseCase } from './get-published-job-posting.use-case';

const posting: PublishedJobPosting = {
  id: '10000000-0000-4000-8000-000000000001',
  title: 'Desarrollador',
  modality: 'REMOTO',
  experienceLevel: 'Junior',
  technicalDescription: 'Descripción registrada',
  publishedAt: new Date('2026-10-01T00:00:00.000Z'),
  company: { name: 'Empresa', description: null, logoUrl: null, bannerUrl: null },
  technicalRequirements: [],
};

const graduate: ActorContext = {
  id: 'user-1', email: 'egresado@example.com', name: null, role: 'titulado',
  permissions: [], scopes: { companyIds: [], graduateId: 'graduate-1', careerIds: [] },
  credentialVersion: 1,
};

function repository(): jest.Mocked<JobPostingRepository> {
  return {
    create: jest.fn(), listPublished: jest.fn(), findPublishedById: jest.fn(),
  };
}

describe('GetPublishedJobPostingUseCase', () => {
  it('returns published details and HU8 technical requirements while reporting unavailable affinity', async () => {
    const jobs = repository();
    jobs.findPublishedById.mockResolvedValue(posting);
    const technicalRequirements = [{
      id: '20000000-0000-4000-8000-000000000001',
      idVacante: posting.id,
      competencia: 'TypeScript',
      nivel: 'Avanzado' as const,
      tipo: 'Obligatorio' as const,
      fechaCreacion: '2026-10-01T00:00:00.000Z',
    }];
    const reader: jest.Mocked<PublishedTechnicalRequirementsReader> = {
      obtenerRequisitos: jest.fn().mockResolvedValue(technicalRequirements),
    };
    const useCase = new GetPublishedJobPostingUseCase(jobs, reader);

    await expect(useCase.execute(posting.id, graduate)).resolves.toMatchObject({
      id: posting.id,
      title: 'Desarrollador',
      company: { name: 'Empresa' },
      publishedTechnicalRequirements: technicalRequirements,
      affinityPercentage: null,
      affinityMessage: expect.stringContaining('No fue posible calcular'),
    });
    expect(reader.obtenerRequisitos).toHaveBeenCalledWith(posting.id);
  });

  it('treats a missing or unavailable vacancy as not found without reading requirements', async () => {
    const jobs = repository();
    jobs.findPublishedById.mockResolvedValue(null);
    const reader: jest.Mocked<PublishedTechnicalRequirementsReader> = {
      obtenerRequisitos: jest.fn(),
    };
    const useCase = new GetPublishedJobPostingUseCase(jobs, reader);

    await expect(useCase.execute(posting.id, graduate)).rejects.toBeInstanceOf(
      JobPostingNotFoundError,
    );
    expect(reader.obtenerRequisitos).not.toHaveBeenCalled();
  });

  it('rejects malformed identifiers without querying the repository', async () => {
    const jobs = repository();
    const reader: jest.Mocked<PublishedTechnicalRequirementsReader> = {
      obtenerRequisitos: jest.fn(),
    };
    const useCase = new GetPublishedJobPostingUseCase(jobs, reader);

    await expect(useCase.execute('not-a-uuid', graduate)).rejects.toBeInstanceOf(
      JobPostingNotFoundError,
    );
    expect(jobs.findPublishedById).not.toHaveBeenCalled();
  });
});
