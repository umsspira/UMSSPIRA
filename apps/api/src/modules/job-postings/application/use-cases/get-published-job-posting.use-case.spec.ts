import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { PublishedJobPosting } from '../../domain/entities/published-job-posting.entity';
import { JobPostingNotFoundError } from '../../domain/errors/job-posting-not-found.error';
import type { JobPostingRepository } from '../ports/job-posting-repository.port';
import { GetPublishedJobPostingUseCase } from './get-published-job-posting.use-case';

const posting: PublishedJobPosting = {
  id: '10000000-0000-4000-8000-000000000001',
  title: 'Desarrollador',
  modality: 'REMOTO',
  experienceLevel: 'Junior',
  technicalDescription: 'Descripción registrada',
  publishedAt: new Date('2026-10-01T00:00:00.000Z'),
  company: {
    name: 'Empresa',
    description: null,
    logoUrl: null,
    bannerUrl: null,
  },
  technicalRequirements: [{
    areaId: '20000000-0000-4000-8000-000000000001',
    name: 'Desarrollo de software',
    level: 'Intermedio',
  }],
};

function actor(role: ActorContext['role'], id: string): ActorContext {
  return {
    id,
    email: 'usuario@example.com',
    name: null,
    role,
    permissions: [],
    scopes: {
      companyIds: [],
      graduateId: role === 'titulado' ? 'graduate-1' : null,
      careerIds: [],
    },
    credentialVersion: 1,
  };
}

function repository(): jest.Mocked<JobPostingRepository> {
  return {
    create: jest.fn(),
    listPublished: jest.fn(),
    findPublishedById: jest.fn(),
    findGraduateSkills: jest.fn(),
  };
}

describe('GetPublishedJobPostingUseCase', () => {
  it('uses the authenticated graduate scope and selected vacancy details for affinity', async () => {
    const jobs = repository();
    jobs.findPublishedById.mockResolvedValue(posting);
    jobs.findGraduateSkills.mockResolvedValue({
      areaIds: ['20000000-0000-4000-8000-000000000001'],
      evidence: [],
    });
    const useCase = new GetPublishedJobPostingUseCase(
      jobs,
      () => new Date('2026-11-02T00:00:00.000Z'),
    );

    await expect(
      useCase.execute('10000000-0000-4000-8000-000000000001', actor('titulado', 'user-1')),
    ).resolves.toMatchObject({
      id: '10000000-0000-4000-8000-000000000001',
      affinityPercentage: 100,
    });
    expect(jobs.findGraduateSkills).toHaveBeenCalledWith('graduate-1');
  });

  it('does not request affinity for actors without graduate scope', async () => {
    const jobs = repository();
    jobs.findPublishedById.mockResolvedValue(posting);
    const useCase = new GetPublishedJobPostingUseCase(jobs);

    await expect(
      useCase.execute('10000000-0000-4000-8000-000000000001', actor('empresa', 'company-user')),
    ).resolves.toMatchObject({ affinityPercentage: null });
    expect(jobs.findGraduateSkills).not.toHaveBeenCalled();
  });

  it('treats a missing or unavailable vacancy as not found', async () => {
    const jobs = repository();
    jobs.findPublishedById.mockResolvedValue(null);
    const useCase = new GetPublishedJobPostingUseCase(jobs);

    await expect(
      useCase.execute('10000000-0000-4000-8000-000000000002', actor('titulado', 'user-1')),
    ).rejects.toBeInstanceOf(JobPostingNotFoundError);
    expect(jobs.findGraduateSkills).not.toHaveBeenCalled();
  });

  it('rejects malformed identifiers without querying the repository', async () => {
    const jobs = repository();
    const useCase = new GetPublishedJobPostingUseCase(jobs);

    await expect(useCase.execute('not-a-uuid', actor('titulado', 'user-1'))).rejects.toBeInstanceOf(
      JobPostingNotFoundError,
    );
    expect(jobs.findPublishedById).not.toHaveBeenCalled();
  });
});
