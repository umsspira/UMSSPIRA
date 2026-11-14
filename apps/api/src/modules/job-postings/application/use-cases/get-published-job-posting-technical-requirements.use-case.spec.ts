import type {
  PublishedTechnicalRequirement,
  PublishedTechnicalRequirementsReader,
} from '../ports/published-technical-requirements-reader.port';
import type { PublishedJobPosting } from '../../domain/entities/published-job-posting.entity';
import { JobPostingNotFoundError } from '../../domain/errors/job-posting-not-found.error';
import type { JobPostingRepository } from '../ports/job-posting-repository.port';
import { GetPublishedJobPostingTechnicalRequirementsUseCase } from './get-published-job-posting-technical-requirements.use-case';

const id = '10000000-0000-4000-8000-000000000001';
const now = new Date('2026-11-04T12:00:00.000Z');
const posting: PublishedJobPosting = {
  id,
  title: 'Desarrollo de software',
  modality: 'REMOTO',
  experienceLevel: 'Junior',
  technicalDescription: null,
  publishedAt: now,
  company: null,
  technicalRequirements: [{ areaId: null, name: 'Habilidad de afinidad', level: null }],
};
const requirement: PublishedTechnicalRequirement = {
  id: '20000000-0000-4000-8000-000000000001',
  idVacante: id,
  competencia: 'PostgreSQL',
  nivel: 'Avanzado',
  tipo: 'Obligatorio',
  descripcion: 'Consultas y modelado relacional.',
  fechaCreacion: now.toISOString(),
};

describe('GetPublishedJobPostingTechnicalRequirementsUseCase', () => {
  let jobs: jest.Mocked<JobPostingRepository>;
  let requirements: jest.Mocked<PublishedTechnicalRequirementsReader>;
  let useCase: GetPublishedJobPostingTechnicalRequirementsUseCase;

  beforeEach(() => {
    jobs = {
      create: jest.fn(),
      listPublished: jest.fn(),
      findPublishedById: jest.fn().mockResolvedValue(posting),
    };
    requirements = { obtenerRequisitos: jest.fn().mockResolvedValue([requirement]) };
    useCase = new GetPublishedJobPostingTechnicalRequirementsUseCase(jobs, requirements, () => now);
  });

  it('checks HU12 availability before reading structured HU2 requirements, without affinity substitution', async () => {
    requirements.obtenerRequisitos.mockImplementation(async (vacancyId) => {
      expect(jobs.findPublishedById).toHaveBeenCalledWith(id, now);
      expect(vacancyId).toBe(id);
      return [requirement];
    });

    await expect(useCase.execute(id)).resolves.toEqual({ idVacante: id, requisitos: [requirement] });
  });

  it('returns an empty array only when HU2 confirms there are no requirements', async () => {
    requirements.obtenerRequisitos.mockResolvedValue([]);
    await expect(useCase.execute(id)).resolves.toEqual({ idVacante: id, requisitos: [] });
  });

  it('does not read HU2 data when the official availability lookup rejects the vacancy', async () => {
    jobs.findPublishedById.mockResolvedValue(null);
    await expect(useCase.execute(id)).rejects.toBeInstanceOf(JobPostingNotFoundError);
    expect(requirements.obtenerRequisitos).not.toHaveBeenCalled();
  });

  it('does not turn an availability lookup failure into an empty result', async () => {
    const failure = new Error('Lookup failed');
    jobs.findPublishedById.mockRejectedValue(failure);
    await expect(useCase.execute(id)).rejects.toBe(failure);
    expect(requirements.obtenerRequisitos).not.toHaveBeenCalled();
  });

  it('propagates HU2 failures instead of substituting HU12 requirements', async () => {
    const failure = new Error('Requirements unavailable');
    requirements.obtenerRequisitos.mockRejectedValue(failure);
    await expect(useCase.execute(id)).rejects.toBe(failure);
  });
});
